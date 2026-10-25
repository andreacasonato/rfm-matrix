// Golden fixture: the 15-customer worked example in Putler's "RFM Analysis For Successful
// Customer Segmentation" (https://www.putler.com/blog/rfm-analysis/), which scores R, F and M
// by quintiles. Hand-checked against the article by the maintainer on 2026-10-25. Customer
// names are left out; IDs are the article's.
//            id, recency days, orders, monetary,  R, F, M
export const putler15 = [
  [1, 3, 6, 540, 5, 4, 4],
  [2, 6, 10, 940, 4, 5, 4],
  [3, 45, 1, 30, 1, 1, 1],
  [4, 21, 2, 64, 2, 2, 2],
  [5, 14, 4, 169, 3, 3, 3],
  [6, 32, 2, 55, 2, 2, 2],
  [7, 5, 3, 130, 4, 3, 3],
  [8, 50, 1, 950, 1, 1, 5],
  [9, 33, 15, 2430, 1, 5, 5],
  [10, 10, 5, 190, 3, 4, 3],
  [11, 5, 8, 840, 4, 4, 4],
  [12, 1, 9, 1410, 5, 5, 5],
  [13, 24, 3, 54, 2, 3, 2],
  [14, 17, 2, 44, 3, 2, 1],
  [15, 4, 1, 32, 5, 1, 1],
] as const;
