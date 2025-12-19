'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  QualityPreset,
  VIDEO_QUALITY_PRESETS,
} from '@/lib/telnyx/qualityPresets';
import { useMediaDevices } from '@/hooks/useMediaDevices';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MeetingSettings;
  onSave: (settings: MeetingSettings) => void;
}

export interface MeetingSettings {
  videoQuality: QualityPreset;
  audioInputId: string;
  audioOutputId: string;
  videoInputId: string;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  mirrorVideo: boolean;
  hideOwnVideo: boolean;
}

const DEFAULT_SETTINGS: MeetingSettings = {
  videoQuality: 'auto',
  audioInputId: '',
  audioOutputId: '',
  videoInputId: '',
  noiseSuppression: true,
  echoCancellation: true,
  mirrorVideo: true,
  hideOwnVideo: false,
};

/**
 * Panel de configuración completo para la reunión
 */
export function SettingsPanel({
  isOpen,
  onClose,
  settings: initialSettings,
  onSave,
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<MeetingSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'general'>('video');

  const { audioInputs, audioOutputs, videoInputs, isLoading } = useMediaDevices();

  // Update settings when devices are loaded
  useEffect(() => {
    if (!isLoading) {
      setSettings((prev) => ({
        ...prev,
        audioInputId: prev.audioInputId || audioInputs[0]?.deviceId || '',
        audioOutputId: prev.audioOutputId || audioOutputs[0]?.deviceId || '',
        videoInputId: prev.videoInputId || videoInputs[0]?.deviceId || '',
      }));
    }
  }, [isLoading, audioInputs, audioOutputs, videoInputs]);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const updateSetting = <K extends keyof MeetingSettings>(
    key: K,
    value: MeetingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'video' as const, label: 'Video', icon: VideoIcon },
    { id: 'audio' as const, label: 'Audio', icon: AudioIcon },
    { id: 'general' as const, label: 'General', icon: SettingsIcon },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración"
      size="lg"
    >
      <div className="flex flex-col sm:flex-row gap-4 min-h-[400px]">
        {/* Tabs */}
        <div className="flex sm:flex-col gap-1 sm:w-40 sm:border-r sm:border-neutral-200 dark:border-neutral-700 sm:pr-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'video' && (
            <VideoSettings
              settings={settings}
              onUpdate={updateSetting}
              videoInputs={videoInputs}
            />
          )}

          {activeTab === 'audio' && (
            <AudioSettings
              settings={settings}
              onUpdate={updateSetting}
              audioInputs={audioInputs}
              audioOutputs={audioOutputs}
            />
          )}

          {activeTab === 'general' && (
            <GeneralSettings settings={settings} onUpdate={updateSetting} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Guardar cambios
        </Button>
      </div>
    </Modal>
  );
}

interface DeviceOption {
  deviceId: string;
  label: string;
}

function VideoSettings({
  settings,
  onUpdate,
  videoInputs,
}: {
  settings: MeetingSettings;
  onUpdate: <K extends keyof MeetingSettings>(key: K, value: MeetingSettings[K]) => void;
  videoInputs: DeviceOption[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Cámara
        </label>
        <select
          value={settings.videoInputId}
          onChange={(e) => onUpdate('videoInputId', e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
        >
          {videoInputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Cámara ${videoInputs.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Calidad de video
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(VIDEO_QUALITY_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => onUpdate('videoQuality', key as QualityPreset)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all',
                settings.videoQuality === key
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <div className="font-medium text-sm text-neutral-900 dark:text-white">
                {preset.label}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm text-neutral-900 dark:text-white">
            Espejo de video
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Ver tu video reflejado (como un espejo)
          </div>
        </div>
        <Toggle
          checked={settings.mirrorVideo}
          onChange={(checked) => onUpdate('mirrorVideo', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm text-neutral-900 dark:text-white">
            Ocultar mi video
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            No ver tu propio video (otros sí lo ven)
          </div>
        </div>
        <Toggle
          checked={settings.hideOwnVideo}
          onChange={(checked) => onUpdate('hideOwnVideo', checked)}
        />
      </div>
    </div>
  );
}

function AudioSettings({
  settings,
  onUpdate,
  audioInputs,
  audioOutputs,
}: {
  settings: MeetingSettings;
  onUpdate: <K extends keyof MeetingSettings>(key: K, value: MeetingSettings[K]) => void;
  audioInputs: DeviceOption[];
  audioOutputs: DeviceOption[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Micrófono
        </label>
        <select
          value={settings.audioInputId}
          onChange={(e) => onUpdate('audioInputId', e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
        >
          {audioInputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Micrófono ${audioInputs.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Altavoz
        </label>
        <select
          value={settings.audioOutputId}
          onChange={(e) => onUpdate('audioOutputId', e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
        >
          {audioOutputs.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Altavoz ${audioOutputs.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm text-neutral-900 dark:text-white">
            Supresión de ruido
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Reduce el ruido de fondo automáticamente
          </div>
        </div>
        <Toggle
          checked={settings.noiseSuppression}
          onChange={(checked) => onUpdate('noiseSuppression', checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm text-neutral-900 dark:text-white">
            Cancelación de eco
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Evita que tu audio haga eco
          </div>
        </div>
        <Toggle
          checked={settings.echoCancellation}
          onChange={(checked) => onUpdate('echoCancellation', checked)}
        />
      </div>
    </div>
  );
}

function GeneralSettings({
  settings,
  onUpdate,
}: {
  settings: MeetingSettings;
  onUpdate: <K extends keyof MeetingSettings>(key: K, value: MeetingSettings[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="font-medium text-sm text-neutral-900 dark:text-white">
              Unity Meet v1.0
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Powered by Telnyx Video SDK
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-neutral-500 dark:text-neutral-400">
        <p>Atajos de teclado:</p>
        <ul className="mt-2 space-y-1">
          <li><kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-xs">M</kbd> - Silenciar/Activar micrófono</li>
          <li><kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-xs">V</kbd> - Apagar/Encender cámara</li>
          <li><kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-xs">C</kbd> - Abrir/Cerrar chat</li>
          <li><kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-xs">H</kbd> - Levantar/Bajar mano</li>
        </ul>
      </div>
    </div>
  );
}

// Toggle component
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors',
        checked ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow',
          checked && 'translate-x-5'
        )}
      />
    </button>
  );
}

// Icons
function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function AudioIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
