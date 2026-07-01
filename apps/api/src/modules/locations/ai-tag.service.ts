import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

type CandidateTag = {
  _id: Types.ObjectId;
  name: string;
};

@Injectable()
export class AiTagService {
  suggestTags(placeName: string, availableTags: CandidateTag[]) {
    const normalizedName = normalizeText(placeName);
    const matched = availableTags.filter((tag) => {
      const normalizedTag = normalizeText(tag.name);
      return (
        normalizedName.includes(normalizedTag) ||
        normalizedTag.split(' ').some((token) => normalizedName.includes(token))
      );
    });

    if (matched.length > 0) {
      return matched.slice(0, 6);
    }

    const keywordHints: Record<string, string[]> = {
      com: ['gia re', 'sinh vien', 'mang di'],
      bun: ['gia re', 'dong review'],
      cafe: ['wifi manh', 'yen tinh'],
      tra: ['wifi manh', 'yen tinh'],
      'nha tro': ['sinh vien', 'may lanh'],
      'quan an': ['gia re', 'cho de xe'],
    };

    const suggestedNames = Object.entries(keywordHints)
      .filter(([keyword]) => normalizedName.includes(keyword))
      .flatMap(([, tags]) => tags);

    if (suggestedNames.length === 0) {
      return availableTags.slice(0, 4);
    }

    const suggestedSet = new Set(suggestedNames);
    return availableTags.filter((tag) =>
      suggestedSet.has(normalizeText(tag.name)),
    );
  }
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
