export type TelegramMessage = {
  message_id: number;
  chat: { id: number | string };
  from?: { id: number | string; username?: string };
  text?: string;
};

export type TelegramCallbackQuery = {
  id: string;
  from: { id: number | string; username?: string };
  message?: { chat: { id: number | string }; message_id: number };
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

export class TelegramApi {
  constructor(private readonly token: string) {}

  async call(method: string, body: Record<string, unknown> | FormData): Promise<any> {
    const isForm = body instanceof FormData;
    const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: isForm ? undefined : { 'Content-Type': 'application/json' },
      body: isForm ? body : JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Telegram ${method} failed: ${response.status} ${await response.text()}`);
    return response.json();
  }

  async getUpdates(offset: number): Promise<TelegramUpdate[]> {
    const data = await this.call('getUpdates', { timeout: 25, offset });
    return data.result || [];
  }

  async sendMessage(chatId: string | number, text: string, keyboard?: InlineKeyboard): Promise<void> {
    await this.call('sendMessage', {
      chat_id: chatId,
      text: text.length > 3900 ? `${text.slice(0, 3900)}\n\nРЎРѕРѕР±С‰РµРЅРёРµ РѕР±СЂРµР·Р°РЅРѕ.` : text,
      ...(keyboard ? { reply_markup: keyboard } : {})
    });
  }

  async answerCallback(callbackQueryId: string, text?: string): Promise<void> {
    await this.call('answerCallbackQuery', { callback_query_id: callbackQueryId, ...(text ? { text } : {}) });
  }
}

