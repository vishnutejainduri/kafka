# Category Queries and Transforms

I didn't really work on categories since it was one the of first APIs.
However, I needed to do some transforms, which I did by dumping things from
mongodb, since the data set was small.

## Category Transforms
The transformation that need to be done is related to the ID. We were using
the category name as an ID, but we have the different categories, at different
levels, sharing the same name (e.g.: `Clothing` is both a level 1 and level2 category).

I preppended the level ID we had before, ending up with something like:
`l1-Clothing`, `l21-Clothing`, etc

The script below is very crud, and relies on the IDs we gave arbitrarily to l1
categories (991, 992, 993). This is because I had to find the level of a category
based on the parent ID.

> I advise against using the script, but it's here for reference.

```js
return DB_CATEGORY.map(c => {
  const id = c.parentCategoryId === null
    ? `l1-${c.id - 990}`
    : c.parentCategoryId > 990
    ? `l2-${c.id}`
    : `l3-${c.id}`

  const parentCategoryId = c.parentCategoryId === null
    ? null
    : c.parentCategoryId > 990
    ? `l1-${c.parentCategoryId - 990}`
    : `l2-${c.parentCategoryId}`

  return ({
    ...c,
    id,
    parentCategoryId
  })
});
```