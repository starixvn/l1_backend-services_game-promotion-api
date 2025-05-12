export interface PaginationResponse<T> {
  items: T[];
  metadata: {
    total: number;
    pageIndex: number;
    pageSize: number;
    totalPages: number;
  };
}
