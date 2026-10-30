import { NotificationType } from "../../../../generated/prisma/client.js";

export type TNotifyPayload = {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
};

export type TNotificationQuery = {
  unread?: boolean;
};
