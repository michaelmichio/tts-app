export type Conversion = {
  id: string;
  userId: string;
  text: string;
  voiceURI: string;
  voiceName: string;
  voiceLang: string;
  rate: number;
  pitch: number;
  volume: number;
  mediaId?: string | null;
  createdAt: string;
  updatedAt: string;
};
