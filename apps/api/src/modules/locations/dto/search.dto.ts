export class SearchDto {
  lat!: string;
  lng!: string;
  page!: string;
  limit!: string;
  keyword?: string;
  categoryId?: string;
  subCategoryId?: string;
}
