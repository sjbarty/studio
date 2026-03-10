import data from './meme-templates.json';

export type MemeTemplate = {
  id: string;
  name: string;
  imageUrl: string;
  imageHint: string;
};

export const MemeTemplates: MemeTemplate[] = data.memeTemplates;
