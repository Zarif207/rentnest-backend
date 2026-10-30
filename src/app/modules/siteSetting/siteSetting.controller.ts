import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { SiteSettingServices } from "./siteSetting.service.js";

const getHomepage = catchAsync(async (req, res) => {
  const result = await SiteSettingServices.getHomepage();

  // Public and identical for everyone; short CDN cache since admins edit it.
  res.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Homepage settings retrieved successfully",
    data: result,
  });
});

const getHomepageConfig = catchAsync(async (req, res) => {
  const result = await SiteSettingServices.getHomepageConfig();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Homepage config retrieved successfully",
    data: result,
  });
});

const updateHomepageConfig = catchAsync(async (req, res) => {
  const result = await SiteSettingServices.updateHomepageConfig(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Homepage settings saved",
    data: result,
  });
});

export const SiteSettingControllers = {
  getHomepage,
  getHomepageConfig,
  updateHomepageConfig,
};
