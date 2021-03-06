/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// @flow

import type { ThreadContext } from "../../types";
import type { ThunkArgs } from "../types";
import { isValidThreadContext } from "../../utils/context";

// How many times to fetch an async set of parent frames.
const MaxAsyncFrames = 5;

export function fetchFrames(cx: ThreadContext) {
  return async function ({ dispatch, client, getState }: ThunkArgs) {
    const { thread } = cx;
    let frames;
    try {
      frames = await client.getFrames(thread);
    } catch (e) {
      // getFrames will fail if the thread has resumed. In this case the thread
      // should no longer be valid and the frames we would have fetched would be
      // discarded anyways.
      if (isValidThreadContext(getState(), cx)) {
        throw e;
      }
    }
    dispatch({ type: "FETCHED_FRAMES", thread, frames, cx });

    for (let i = 0; i < MaxAsyncFrames; i++) {
      let asyncFrames;
      try {
        asyncFrames = await client.loadAsyncParentFrames(thread, i + 1);
      } catch (e) {
        if (isValidThreadContext(getState(), cx)) {
          throw e;
        }
        break;
      }
      if (!asyncFrames.length) {
        break;
      }
      dispatch({ type: "ADD_ASYNC_FRAMES", thread, asyncFrames, cx });
    }
  };
}
