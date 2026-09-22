---
title: "Optimal lane depth for block stacking"
date: "2018-11-02T22:36:04"
updated: "2019-07-17T13:12:56"
description: "About more than a year ago, I published a paper with Jeffrey Smith and Kevin Gue in the International Journal of Production Research on the optimal lane depth for block…"
category:
  slug: "research"
  name: "Research"
tags:
  - name: "Block stacking"
    slug: "block-stacking"
  - name: "Lane depth"
    slug: "lane-depth"
  - name: "Space utilization"
    slug: "space-utilization"
  - name: "Warehouse design"
    slug: "warehouse-design"
  - name: "Warehouse layout"
    slug: "warehouse-layout"
permalink: "/research/optimal-lane-depth-for-block-stacking/"
wordpressId: 90
---

About more than a year ago, I published a paper with [Jeffrey Smith](http://jsmith.co/) and [Kevin Gue](https://kevingue.wordpress.com/) in the International Journal of Production Research on the optimal lane depth for block stacking (the first of series of papers on block stacking extracted my Ph.D. dissertation). The paper can be downloaded from [here](https://www.researchgate.net/profile/Shahab_Derhami/publication/297662902_Optimising_space_utilisation_in_block_stacking_warehouses/links/59d7edaba6fdcc2aad0650d6/Optimising-space-utilisation-in-block-stacking-warehouses.pdf?origin=publication_detail) and the journal website [here](http://dx.doi.org/10.1080/00207543.2016.1154216).

Block stacking is referred to storing pallets of Stock Keeping Units (SKUs) on top of one another in lanes on the warehouse floor. The fact that this storage system does not require racks or storage facility has made it very popular especially when pallets are heavy and large like SKUs in the bottled beverage and home appliance industries.

<figure><img src="/wp-content/uploads/2018/11/Block-stacking-warehouse.jpg" alt="" width="426" height="319" loading="lazy" decoding="async"></figure>

Block stacking is mostly operated under the _shared_ (_random_) storage policy. Under this policy, once a lane is empty, it is available to all SKUs. However, to avoid blockage or pallet relocations, only pallets of the same SKU are allowed to be stored in the same lane. This renders some waste of storage space in the lanes as unoccupied pallet positions in a lane are not available to other SKUs. This effect is termed _honeycombing,_ and waste associated with it remains until the lane is entirely emptied or occupied. Aisles also contribute to the waste of storage space because they are not directly used for storage though they are required to access lanes.

<figure><img src="/wp-content/uploads/2018/11/Honeycombing-accessibility.jpg" alt="" width="643" height="532" loading="lazy" decoding="async"></figure>

The traditional lane depth model (Kind 1975; Matson 1982) tries to minimize the total waste of storage space by finding the lane depth that optimizes the trade-off between honeycombing and accessibility waste. However, this model assumes infinite replenishment rate, which is only the case in warehouses receiving products from suppliers (a truck unloads a batch of pallets, and it is safe to assume pallets are stored instantaneously). This is not the case in warehouses located in manufacturing environments. We relaxed this assumption and obtained the model for finite replenishment rates.

For a set of _N_ SKUs that are produced in batches of _Q<sub>i</sub>_ pallets, stored by the rate of _P<sub>i</sub>_ pallets/hr, retrieved by the rate of _λ<sub>i</sub>_ pallets/hr, and stacked to _Z<sub>i</sub>_ pallets, the optimal lane depth for the case that _P<sub>i</sub>_ > _λ<sub>i</sub>_ is

<p class="equation"><img src="/wp-content/ql-cache/quicklatex.com-6cb5a877e51eefc27dd456bed8fc89db_l3.png" alt="\begin{equation*} x_c^*=\sqrt{\left(\frac{A}{2N}\right)\sum_{i\in I}\left(\frac{1}{Z_i P_i}\right)\left(Q_i(P_i-\lambda_i)-2\lambda_i\right)}, \end{equation*}" width="299" height="44" loading="lazy" decoding="async" class="equation-img"></p>

where _A_ is the aisle width in units of pallets. If  _P<sub>i</sub> < λ<sub>i</sub>_, the optimal lane depth is given by

<p class="equation"><img src="/wp-content/ql-cache/quicklatex.com-12aeed3290f5412613766e25f180b2c0_l3.png" alt="\begin{equation*} x_c^*=\sqrt{\left(\frac{A}{2N}\right)\sum_{i\in I}\left(\frac{1}{Z_i \lambda_i}\right)\left((Q_i-2)(\lambda_i-P_i)\right)}, \end{equation*}" width="297" height="44" loading="lazy" decoding="async" class="equation-img"></p>

and for _P<sub>i</sub>_ =∞, it is

<p class="equation"><img src="/wp-content/ql-cache/quicklatex.com-2541e82c79df5b0f737ff64805030588_l3.png" alt="\begin{equation*} x_c^*=\sqrt{\left(\frac{A}{2N}\right)\sum_{i\in I}\left(\frac{Q_i}{Z_i }\right)}. \end{equation*}" width="163" height="44" loading="lazy" decoding="async" class="equation-img"></p>

One interesting fact we found about the optimal depth model was that the total waste of storage space as a function of lane depth behaves similar to the famous EOQ model.

<figure><img src="/wp-content/uploads/2018/11/components-of-waste.png" alt="" width="1772" height="1107" loading="lazy" decoding="async"></figure>

The lane depth model is derived using restrictive assumptions such as deterministic demand and production rates. We performed a simulation model and relaxed these assumptions to study the model under stochastic demand and production rates, and production batch sizes that usually exist in real-world situations. The results showed that the model produces near-optimal solutions under high variations applied to these parameters and produces an error of up to 7% for the optimal lane depth and 2% for space utilization.

<figure><img src="/wp-content/uploads/2018/11/P-GT-L-experimental-study.png" alt="" width="1772" height="1107" loading="lazy" decoding="async"></figure>

We also tested the traditional model (infinite replenishment rate) to estimate the optimal lane depth in a manufacturing warehouse where products are stored by finite production rates. The results showed that as the ratio of demand rate to the production rate increases, the error of the infinite model increases exponentially and reaches up to 400% overestimation of the optimal lane depth.

<figure><img src="/wp-content/uploads/2018/11/finite-infinite-lane-depth.png" alt="" width="1772" height="1107" loading="lazy" decoding="async"></figure>

One of our main findings was that space utilization as a function of lane depth becomes smooth for depths deeper than the optimal lane depth. However, loss in space utilization becomes larger as the lane depth gets shallower than the optimal point. As a rule of thumb, one can say, when calculating the optimal lane depth is not possible, it is better from the space utilization point of view to have deep lanes rather than shallow lanes. However, this may impact material handling costs as the resulting solutions have fewer aisles and also vehicles have to travel longer distances to replenish/retrieve deeper lanes.

<figure><img src="/wp-content/uploads/2018/11/Utilization-vs-waste-of-space.png" alt="" width="1772" height="1107" loading="lazy" decoding="async"></figure>

It is important to take into account that the lane depth model optimizes the trade-off between honeycombing and accessibility waste. It computes the accessibility waste for a lane only for the period that the lane is occupied and assumes dedicated space to an aisle is available for storage otherwise. That is, it underestimates accessibility waste when it comes to design a full layout with fixed aisles. Stay tuned for further research that addresses this issue.

### References:

1.  Kind, D. A., “Elements of Space Utilization.” _Transportation and Distribution Management_, 15, 29–34, 1975.
2.  Matson, J. O., “The Analysis of Selected Unit Load Storage Systems.” PhD thesis, Georgia Institute of Technology, Atlanta, GA, 1982.
