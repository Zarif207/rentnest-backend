import httpStatus from "http-status";
import prisma from "../../../lib/prisma.js";
import AppError from "../../utils/AppError.js";
import { paginationHelper } from "../../helpers/paginationHelper.js";
import { TPaginationOptions } from "../../interfaces/pagination.js";
import {
  TNotificationQuery,
  TNotifyPayload,
} from "./notification.interface.js";

/**
 * Sends a notification to one user or many. Call it after the main action
 * succeeds. It never throws: a failed notification is logged and ignored, so
 * it can't break the action that triggered it. Awaited by callers because
 * serverless functions may stop once the response is sent.
 */
const notify = async (userIds: string | string[], payload: TNotifyPayload) => {
  try {
    const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
    if (ids.length === 0) return;

    await prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link ?? null,
      })),
    });
  } catch (error) {
    console.error("Failed to send notification", payload.type, error);
  }
};

/** Notifies every active admin (e.g. a new landlord to review). Never throws. */
const notifyAdmins = async (payload: TNotifyPayload) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        userStatus: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    await notify(
      admins.map((admin) => admin.id),
      payload,
    );
  } catch (error) {
    console.error("Failed to notify admins", payload.type, error);
  }
};

const getMyNotifications = async (
  userId: string,
  filters: TNotificationQuery,
  options: TPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const where = {
    userId,
    ...(filters.unread ? { isRead: false } : {}),
  };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  return {
    meta: {
      ...paginationHelper.buildMeta(page, limit, total),
      unreadCount,
    },
    data,
  };
};

const markAsRead = async (id: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: {
      id,
    },
    select: {
      userId: true,
    },
  });

  // Someone else's notification looks the same as a missing one.
  if (!notification || notification.userId !== userId) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  return prisma.notification.update({
    where: {
      id,
    },
    data: {
      isRead: true,
    },
  });
};

const markAllAsRead = async (userId: string) => {
  const { count } = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return { updated: count };
};

/**
 * Marks your unread notifications whose link starts with `linkPrefix` as read
 * (e.g. opening /dashboard/admin/properties clears the "new listing" ones).
 */
const markReadByLink = async (userId: string, linkPrefix: string) => {
  const { count } = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
      link: {
        startsWith: linkPrefix,
      },
    },
    data: {
      isRead: true,
    },
  });

  return { updated: count };
};

/**
 * Your unread count, plus unread counts per link so the dashboard can badge
 * each section. Notifications without a link count only toward the total.
 */
const getSummary = async (userId: string) => {
  const where = {
    userId,
    isRead: false,
  };

  const [unreadTotal, groups] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.groupBy({
      by: ["link"],
      where: {
        ...where,
        link: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  return {
    unreadTotal,
    byLink: groups
      .map((group) => ({
        link: group.link as string,
        count: group._count._all,
      }))
      .toSorted((a, b) => b.count - a.count || a.link.localeCompare(b.link)),
  };
};

export const NotificationServices = {
  notify,
  notifyAdmins,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  markReadByLink,
  getSummary,
};
