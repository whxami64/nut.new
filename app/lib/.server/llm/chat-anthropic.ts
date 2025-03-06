import type { CoreMessage } from 'ai';
import Anthropic from '@anthropic-ai/sdk';
import { ChatStreamController } from '~/utils/chatStreamController';
import type { ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages/messages.mjs';
import type { FileMap } from './stream-text';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { extractRelativePath } from '~/utils/diff';
import { wrapWithSpan, getCurrentSpan } from '~/lib/.server/otel-wrapper';
import { assert } from '~/lib/replay/ReplayProtocolClient';

const Model = 'claude-3-7-sonnet-20250219';
const MaxMessageTokens = 8192;

function convertContentToAnthropic(content: any): ContentBlockParam[] {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  if (Array.isArray(content)) {
    return content.flatMap(convertContentToAnthropic);
  }
  if (content.type === "text" && typeof content.text === "string") {
    return [{ type: "text", text: content.text }];
  }
  if (content.type == "image" && typeof content.image == "string") {
    // Parse data URL to extract content type and base64 data
    const matches = content.image.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.log("Invalid image data URL format");
      return [];
    }
    return [{
      type: "image",
      source: {
        type: "base64",
        data: matches[2],
        media_type: matches[1]
      }
    }];
  }
  console.log("AnthropicUnknownContent", JSON.stringify(content, null, 2));
  return [];
}

export interface ChatState {
  apiKey: string;
  isUser: boolean;
  userLoginKey?: string;

  // Info about how the chat was processed which will be conveyed back to the client.
  infos: string[];
}

export interface AnthropicCall {
  systemPrompt: string;
  messages: MessageParam[];
  responseText: string;
  completionTokens: number;
  promptTokens: number;
}

function maybeParseAnthropicErrorPromptTooLong(e: any) {
  try {
    const { type, message } = e.error.error;
    if (type === "invalid_request_error") {
      const match = /prompt is too long: (\d+) tokens > (\d+) maximum/.exec(message);
      if (match) {
        const tokens = +match[1];
        const maximum = +match[2];
        return { tokens, maximum };
      }
    }
  } catch (e) {
    console.log("AnthropicParseError", e);
  }
  return undefined;
}

async function countTokens(state: ChatState, messages: MessageParam[], systemPrompt: string): Promise<number> {
  const anthropic = new Anthropic({ apiKey: state.apiKey });
  const response = await anthropic.messages.countTokens({
    model: Model,
    messages,
    system: systemPrompt,
  });
  return response.input_tokens;
}

function compressMessageText(text: string, factor: number): string {
  assert(factor > 0 && factor <= 1, `Invalid compression factor: ${factor}`);
  return text.slice(text.length - Math.round(text.length * factor));
}

function compressMessage(msg: MessageParam, factor: number): MessageParam {
  // Only compress assistant messages.
  if (msg.role != "assistant") {
    return msg;
  }

  const newMessage = { ...msg };
  if (typeof newMessage.content === "string") {
    newMessage.content = compressMessageText(newMessage.content, factor);
  } else if (Array.isArray(newMessage.content)) {
    newMessage.content = newMessage.content.map(block => {
      const newBlock = { ...block };
      if (newBlock.type === "text") {
        newBlock.text = compressMessageText(newBlock.text, factor);
      }
      return newBlock;
    });
  }
  return newMessage;
}

function compressMessages(messages: MessageParam[], factor: number): MessageParam[] {
  const compressed = [];
  for (const msg of messages) {
    compressed.push(compressMessage(msg, factor));
  }
  return compressed;
}

async function reduceMessageSize(state: ChatState, messages: MessageParam[], systemPrompt: string, maximum: number): Promise<MessageParam[]> {
  for (let iteration = 0; iteration < 5; iteration++) {
    const tokens = await countTokens(state, messages, systemPrompt);

    console.log(`AnthropicReduceMessageSize ${JSON.stringify({ iteration, tokens, maximum })}`);
    state.infos.push(`AnthropicReduceMessageSize ${JSON.stringify({ iteration, tokens, maximum })}`);

    if (tokens <= maximum) {
      return messages;
    }

    const factor = (maximum / tokens) * 0.9;

    // Compress messages to roughly target size
    messages = compressMessages(messages, factor);
  }
  throw new Error("Message compression failed");
}

async function callAnthropicRaw(state: ChatState, systemPrompt: string, messages: MessageParam[]): Promise<Anthropic.Messages.Message> {
  const anthropic = new Anthropic({ apiKey: state.apiKey });

  try {
    return await anthropic.messages.create({
      model: Model,
      messages,
      max_tokens: MaxMessageTokens,
      system: systemPrompt,
    });
  } catch (e: any) {
    console.error("AnthropicError", e);
    state.infos.push(`AnthropicError: ${e}`);

    try {
      console.log(`AnthropicErrorData ${JSON.stringify(e.error)}`);
      state.infos.push(`AnthropicErrorData ${JSON.stringify(e.error)}`);
    } catch (e) {
      console.log(`AnthropicErrorDataException ${e}`);
      state.infos.push(`AnthropicErrorDataException ${e}`);
    }

    state.infos.push(`AnthropicErrorMessages ${JSON.stringify({ systemPrompt, messages })}`);

    const info = maybeParseAnthropicErrorPromptTooLong(e);
    if (info) {
      const { maximum } = info;
      const newMessages = await reduceMessageSize(state, messages, systemPrompt, maximum);

      state.infos.push(`AnthropicCompressedMessages ${JSON.stringify({ systemPrompt, newMessages })}`);

      return await anthropic.messages.create({
        model: Model,
        messages: newMessages,
        max_tokens: MaxMessageTokens,
        system: systemPrompt,
      });
    }
    throw e;
  }
}

export const callAnthropic = wrapWithSpan(
  {
    name: "llm-call",
    attrs: {
      "llm.provider": "anthropic",
      "llm.model": Model,
    },
  },

  // eslint-disable-next-line prefer-arrow-callback
  async function callAnthropic(state: ChatState, reason: string, systemPrompt: string, messages: MessageParam[]): Promise<AnthropicCall> {
    const span = getCurrentSpan();
    span?.setAttributes({
      "llm.chat.calls": 1, // so we can SUM(llm.chat.calls) without doing a COUNT + filter
      "llm.chat.num_messages": messages.length,
      "llm.chat.reason": reason,
      "llm.chat.is_user_api_key": state.isUser,
      "llm.chat.user_login_key": state.userLoginKey,
    });

    console.log("AnthropicMessageSend");

    const response = await callAnthropicRaw(state, systemPrompt, messages);

    let responseText = "";
    for (const content of response.content) {
      if (content.type === "text") {
        responseText += content.text;
      } else {
        console.log("AnthropicUnknownResponse", JSON.stringify(content, null, 2));
      }
    }

    const completionTokens = response.usage.output_tokens;
    const promptTokens = response.usage.input_tokens;

    span?.setAttributes({
      "llm.chat.prompt_tokens": promptTokens,
      "llm.chat.completion_tokens": completionTokens,

      // to save us needing to worry about a derived column
      "llm.chat.total_tokens": completionTokens + promptTokens,
    });

    console.log("AnthropicMessageResponse");

    return {
      systemPrompt,
      messages,
      responseText,
      completionTokens,
      promptTokens,
    };
  },
);

function getFileContents(files: FileMap, path: string): string {
  for (const [filePath, file] of Object.entries(files)) {
    if (extractRelativePath(filePath) === path) {
      if (file?.type === "file" && !file.isBinary) {
        return file.content;
      }
    }
  }
  return "";
}

function shouldRestorePartialFile(existingContent: string, newContent: string): boolean {
  return existingContent.length > newContent.length;
}

async function restorePartialFile(
  state: ChatState,
  existingContent: string,
  newContent: string,
  responseDescription: string
) {
  const systemPrompt = `
You are a helpful assistant that restores code skipped over by partial updates made by another assistant.

You will be given the existing content for a file and the new content that may contain partial updates.
Your task is to return complete restored content which both reflects the changes made in the new content
and includes any code that was removed from the original file.

Describe any places in the new content where code may have been removed.
ULTRA IMPORTANT: Only remove content that has been skipped due to comments similar to the following:

// rest of the code remains the same.
// this function is unchanged.

ULTRA IMPORTANT: Do not restore content that was intentionally removed by the other assistant.
ULTRA IMPORTANT: The restored content should be returned in the following format:

<restoredContent>
Restored content goes here
</restoredContent>
  `;

  const userPrompt = `
The existing content for the file is:

<existingContent>
${existingContent}
</existingContent>

The new content that may contain partial updates is:

<newContent>
${newContent}
</newContent>

The other assistant's description of its changes is:
<description>
${responseDescription}
</description>
  `;

  const messages: MessageParam[] = [
    {
      role: "user",
      content: userPrompt,
    },
  ];

  const restoreCall = await callAnthropic(state, "RestorePartialFile", systemPrompt, messages);

  const OpenTag = "<restoredContent>";
  const CloseTag = "</restoredContent>";
  const openTag = restoreCall.responseText.indexOf(OpenTag);
  const closeTag = restoreCall.responseText.indexOf(CloseTag);

  if (openTag === -1 || closeTag === -1) {
    state.infos.push(`Error: Invalid restored content: ${restoreCall.responseText}`);
    return { restoreCall, restoredContent: newContent };
  }

  const restoredContent = restoreCall.responseText.substring(openTag + OpenTag.length, closeTag);

  // Sometimes the model ignores its instructions and doesn't return the content if it hasn't
  // made any modifications. In this case we use the unmodified new content.
  if (restoredContent.length < existingContent.length && restoredContent.length < newContent.length) {
    state.infos.push(`Error: Restored content too short: ${restoreCall.responseText}`);
    return { restoreCall, restoredContent: newContent };
  }

  return { restoreCall, restoredContent };
}

// Return the english description in a model response, skipping over any artifacts.
function getMessageDescription(responseText: string): string {
  const OpenTag = "<boltArtifact";
  const CloseTag = "</boltArtifact>";

  while (true) {
    const openTag = responseText.indexOf(OpenTag);
    if (openTag === -1) {
      break;
    }

    const prefix = responseText.substring(0, openTag);

    const closeTag = responseText.indexOf(CloseTag, openTag + OpenTag.length);
    if (closeTag === -1) {
      responseText = prefix;
    } else {
      responseText = prefix + responseText.substring(closeTag + CloseTag.length);
    }
  }
  return responseText;
}

async function getLatestPackageVersion(state: ChatState, packageName: string) {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    const data = await response.json() as any;
    if (typeof data.version == "string") {
      return data.version;
    }
  } catch (e) {
    state.infos.push(`Error getting latest package version: ${packageName}`);
  }
  return undefined;
}

function ignorePackageUpgrade(packageName: string) {
  // Don't upgrade react, our support for react 19 isn't complete yet.
  return packageName.startsWith("react");
}

// Upgrade dependencies in package.json to the latest version, instead of the random
// and sometimes ancient versions that the AI picks.
async function upgradePackageJSON(state: ChatState, content: string) {
  try {
    const packageJSON = JSON.parse(content);
    for (const key of Object.keys(packageJSON.dependencies)) {
      if (!ignorePackageUpgrade(key)) {
        const version = await getLatestPackageVersion(state, key);
        if (version) {
          packageJSON.dependencies[key] = version;
        }
      }
    }
    return JSON.stringify(packageJSON, null, 2);
  } catch (e) {
    state.infos.push(`Error upgrading package.json: ${e}`);
    return content;
  }
}

function replaceFileContents(state: ChatState, responseText: string, oldContent: string, newContent: string) {
  let contentIndex = responseText.indexOf(oldContent);

  if (contentIndex === -1) {
    // The old content may have a trailing newline which wasn't originally present in the response.
    oldContent = oldContent.trim();
    contentIndex = responseText.indexOf(oldContent);

    if (contentIndex == -1) {
      state.infos.push(`Error: Old content not found in response: ${JSON.stringify({ responseText, oldContent })}`);
      return responseText;
    }
  }

  return responseText.substring(0, contentIndex) +
    newContent +
    responseText.substring(contentIndex + oldContent.length);
}

interface FileContents {
  filePath: string;
  content: string;
}

async function fixupResponseFiles(state: ChatState, files: FileMap, responseText: string) {
  const fileContents: FileContents[] = [];

  const messageParser = new StreamingMessageParser({
    callbacks: {
      onActionClose: (data) => {
        if (data.action.type === "file") {
          const { filePath, content } = data.action;
          fileContents.push({
            filePath,
            content,
          });
        }
      },
    }
  });

  messageParser.parse("restore-partial-files-message-id", responseText);
  const responseDescription = getMessageDescription(responseText);

  const restoreCalls: AnthropicCall[] = [];
  for (const { filePath, content: newContent } of fileContents) {
    const existingContent = getFileContents(files, filePath);

    if (shouldRestorePartialFile(existingContent, newContent)) {
      const { restoreCall, restoredContent } = await restorePartialFile(
        state,
        existingContent,
        newContent,
        responseDescription
      );
      restoreCalls.push(restoreCall);
      responseText = replaceFileContents(state, responseText, newContent, restoredContent);
    }

    if (filePath.includes("package.json")) {
      const newPackageJSON = await upgradePackageJSON(state, newContent);
      responseText = replaceFileContents(state, responseText, newContent, newPackageJSON);
    }
  }

  return { responseText, restoreCalls };
}

export type ChatAnthropicInfo = {
  mainCall: AnthropicCall;
  restoreCalls: AnthropicCall[];
  infos: string[];
}

export async function chatAnthropic(state: ChatState, chatController: ChatStreamController, files: FileMap, systemPrompt: string, messages: CoreMessage[]) {
  const messageParams: MessageParam[] = [];

  for (const message of messages) {
    const role = message.role == "user" ? "user" : "assistant";
    const content = convertContentToAnthropic(message.content);
    messageParams.push({
      role,
      content,
    });
  }

  const mainCall = await callAnthropic(state, "SendChatMessage", systemPrompt, messageParams);

  const { responseText, restoreCalls } = await fixupResponseFiles(state, files, mainCall.responseText);

  chatController.writeText(responseText);

  const chatInfo: ChatAnthropicInfo = { mainCall, restoreCalls, infos: state.infos };

  let completionTokens = 0;
  let promptTokens = 0;
  for (const callInfo of [mainCall, ...restoreCalls]) {
    completionTokens += callInfo.completionTokens;
    promptTokens += callInfo.promptTokens;
  }

  chatController.writeUsage({ chatInfo, completionTokens, promptTokens });
}
