/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { usePalaceStore } from './store/usePalaceStore';
import { Editor2D } from './components/editor/Editor2D';
import { Explorer3D } from './components/explorer/Explorer3D';
import { UIOverlay } from './components/ui/UIOverlay';
import { LociModal } from './components/shared/LociModal';

export default function App() {
  const mode = usePalaceStore((state) => state.mode);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-gray-900 text-white font-sans">
      {/* Main Canvas Area */}
      {mode === '2D' ? <Editor2D /> : <Explorer3D />}

      {/* UI Overlay (Toolbar, Inventory, Mode Switch) */}
      <UIOverlay />

      {/* Modals */}
      <LociModal />
    </div>
  );
}

