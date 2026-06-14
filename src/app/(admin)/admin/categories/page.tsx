import { prisma } from '@/lib/prisma';import { CategoryManager } from './category-manager'
export default async function CategoriesPage(){const categories=await prisma.category.findMany({orderBy:[{sortOrder:'asc'},{name:'asc'}],include:{_count:{select:{items:true}}}});return <CategoryManager categories={categories.map(c=>({...c,itemCount:c._count.items}))}/>}
