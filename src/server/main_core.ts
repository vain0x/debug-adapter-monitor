import express from "express"
import { newRouter } from "./web_router"
import { startServer } from "./web_server"

// -----------------------------------------------
// Context
// -----------------------------------------------

export interface AppServerContext {
  router: express.RequestHandler
}

export const newServerContext = (signal: AbortSignal): AppServerContext => {
  return {
    router: newRouter(signal),
  }
}

// -----------------------------------------------
// Core
// -----------------------------------------------

export const mainCore = startServer
