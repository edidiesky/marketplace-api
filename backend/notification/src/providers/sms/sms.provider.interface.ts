export interface SendSmsOptions {
  to:      string;
  message: string;
}

export interface ISmsProvider {
  sendSms(options: SendSmsOptions): Promise<void>;
}