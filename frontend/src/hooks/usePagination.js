import { useEffect, useMemo, useState } from 'react';

export function usePagination(items, pageSize = 20) {
  const [page, setPage] = useState(1);
  const totalItems = items?.length || 0;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    if (!totalItems) return [];
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, totalItems]);

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    hasPagination: totalItems > pageSize,
    canPrev: page > 1,
    canNext: page < totalPages,
  };
}

