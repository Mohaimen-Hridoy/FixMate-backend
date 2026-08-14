import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import { slugify } from "@/utils/slugify";
import type { CategoryBody, CategoryUpdateBody } from "@/validations/category.validation";

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

async function uniqueCategorySlug(name: string, ignoreId?: string): Promise<string> {
  const root = slugify(name);
  let candidate = root;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (true) {
    const clash = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!clash || clash.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
}

export async function createCategory(input: CategoryBody) {
  const slug = await uniqueCategorySlug(input.name);
  return prisma.category.create({ data: { slug, name: input.name.trim(), icon: input.icon, count: 0 } });
}

export async function updateCategory(id: string, input: CategoryUpdateBody) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Category not found");

  const data: { name?: string; icon?: string; slug?: string } = {};
  if (input.name !== undefined) {
    data.name = input.name.trim();
    // Keep slug stable unless the name actually changes — services already
    // reference the old slug via `categorySlug`, so this also keeps the
    // catalog's denormalized `count` link intact for the same category.
    if (input.name.trim() !== existing.name) {
      data.slug = await uniqueCategorySlug(input.name, id);
    }
  }
  if (input.icon !== undefined) data.icon = input.icon;

  // If the slug is changing, keep every Service row pointing at it in sync
  // — same reasoning as service.service.ts's bumpCategoryCount, just for a
  // rename instead of a count delta.
  if (data.slug && data.slug !== existing.slug) {
    return prisma.$transaction(async (tx) => {
      await tx.service.updateMany({ where: { categorySlug: existing.slug }, data: { categorySlug: data.slug } });
      return tx.category.update({ where: { id }, data });
    });
  }

  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string): Promise<void> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound("Category not found");

  if (existing.count > 0) {
    throw ApiError.badRequest(
      "This category still has services attached. Move or remove them before deleting it.",
    );
  }

  await prisma.category.delete({ where: { id } });
}
