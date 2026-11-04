// The users API returns total/page/pageSize, rather than an unpaged directory.
export async function loadUserDirectory(api, filters = {}) {
  const first = await api.users.list({ ...filters, page: 1, pageSize: 500 });
  if (Array.isArray(first)) return first;
  if (!Array.isArray(first?.items)) throw new Error('Danh sách tài khoản trả về không hợp lệ.');
  const total = first.total ?? first.totalItems ?? first.items.length;
  const size = first.pageSize ?? 500;
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 500
  )
    throw new Error('Thông tin phân trang tài khoản không hợp lệ.');
  const items = [...first.items];
  for (let page = 2; page <= Math.ceil(total / size); page++) {
    const next = await api.users.list({ ...filters, page, pageSize: size });
    if (
      !Array.isArray(next?.items) ||
      next.page !== page ||
      (next.total ?? next.totalItems) !== total ||
      next.items.length === 0
    )
      throw new Error('Danh sách tài khoản đã thay đổi. Vui lòng tải lại.');
    items.push(...next.items);
  }
  if (items.length !== total || new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error('Danh sách tài khoản chưa đầy đủ. Vui lòng tải lại.');
  return items;
}
