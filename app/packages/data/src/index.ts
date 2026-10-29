//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { ScanRun } from './ScanRun.js';
import { ShortcutRecord } from './ShortcutRecord.js';
import type { UniversalAppSchema } from '@rayfin-app/shared';

/**
 * The app's Rayfin data schema: saved scans and their inventory rows.
 *
 * `UniversalAppSchema` in `@rayfin-app/shared` is what makes
 * `(await getRayfinClient()).data.<Entity>` typed, so keep it in step with `schema`
 * below: a class registered in `schema` but missing from the shared type is
 * reachable at runtime and invisible to the compiler.
 */
export type { UniversalAppSchema };
export { ScanRun, ShortcutRecord };

export const schema = [ScanRun, ShortcutRecord];
