import type { RequestHandler } from "express";
import { NotFoundError } from "../errors/app-error";

/** Ends the API, portal and health routers: no route matched (404 NOT_FOUND via PS-07). */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError());
};
