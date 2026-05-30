export function mapId(doc: any) {
  if (!doc) return doc
  const ret = { ...doc }
  ret.id = ret.id ?? ret._id?.toString?.() ?? ret._id
  delete ret._id
  delete ret.__v
  return ret
}
