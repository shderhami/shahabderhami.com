---
title: "Designing optimal layouts for block stacking warehouses"
date: "2019-07-12T19:49:01"
updated: "2019-07-17T13:09:37"
description: "Recently, I published a paper in IISE Transactions with Jeffrey Smith and Kevin Gue on designing space-efficient layouts for block stacking warehouses. Block stacking warehouses are palletized warehouses in which…"
category:
  slug: "research"
  name: "Research"
tags:
  - name: "Block stacking"
    slug: "block-stacking"
  - name: "Lane depth"
    slug: "lane-depth"
  - name: "Palletized warehouse"
    slug: "palletized-warehouse"
  - name: "Space utilization"
    slug: "space-utilization"
  - name: "Warehouse design"
    slug: "warehouse-design"
  - name: "Warehouse layout"
    slug: "warehouse-layout"
permalink: "/research/designing-optimal-layouts-for-block-stacking-warehouses/"
wordpressId: 147
---

Recently, I published a paper in IISE Transactions with [Jeffrey Smith](http://jsmith.co/?q=node/6) and [Kevin Gue](https://kevingue.wordpress.com/) on designing space-efficient layouts for block stacking warehouses. Block stacking warehouses are palletized warehouses in which pallets of Stock Keeping Units (SKUs) are stacked on top of one another on the warehouse floor in lanes (see Figure 1). This storage system suffers from two types of waste of storage space: honeycombing and accessibility waste. Honeycombing waste refers to the unoccupied pallet positions in a lane that are not available to all SKUs as a result of assigning the lane to only one SKU to prevent pallet relocation and blockage. This assignment, however, can be temporarily (shared or random storage policy) or permanent (dedicated storage policy). Accessibility waste refers to the space dedicated to aisles since they are not used directly for storage. There is a trade-off between honeycombing and accessibility waste. Deep lanes generate more honeycombing waste but incur less average accessibility waste per pallet position while the reverse is true for shallow lanes.

<figure><img src="/wp-content/uploads/2019/07/Block-stacking-picture-e1562969311998.jpg" alt="" width="3024" height="4032" loading="lazy" decoding="async"><figcaption>Figure 1. A Block stacking warehouse</figcaption></figure>

Figure 2 demonstrates a typical layout for a block stacking warehouse. The layout consists of multiple bays (possibly with different depths) each containing multiple lanes for pallet storage. Preferably, bays are arranged back to back, and each pair of bays shares an aisle (for the sake of space utilization). Forklifts travel through the aisles and cross-aisles to retrieve or replenish pallets. Such warehouses are widely used as the main storage system in industries dealing with heavy and large pallets of goods such as bottled beverage and home appliance industries.

<figure><img src="/wp-content/uploads/2019/07/Typical-block-stacking-layout.png" alt="" width="1309" height="1965" loading="lazy" decoding="async"><figcaption>Figure 2. A typical layout of a block stacking warehouse</figcaption></figure>

When it comes to designing a block stacking layout similar to Figure 2, the first question that comes to mind is how deep the lanes should be to minimize the waste of storage space in the warehouse. One may suggest using the traditional lane depth model (see [my previous post](/research/optimal-lane-depth-for-block-stacking/)) to estimate a common depth for all bays (if a common bay depth is allowed). The lane depth model, however, does not obtain the optimal depth for bays in a layout. In our paper, we mathematically proved that the traditional lane depth model underestimates the accessibility waste when used to estimate bay depth for a warehouse layout like Figure 2. This is because the lane depth model accounts accessibility waste only for the period that a lane is occupied and considers aisle space available for storage otherwise.

In fact, the traditional lane depth model is designed to optimize the trade-off between the depth and width of a block of pallets (see Figure 3). It is suitable for finding a space-efficient lane depth for a batch of pallets that are block stacked in a wide area. It is not appropriate for designing the entire layout of a warehouse with multiple bays and aisles. When a layout is designed, the arrangement of aisles, bays, and lanes are marked in the warehouse floor for vehicle and operator guides. In such a warehouse, the dedicated space to an aisle is never considered for storage no matter its adjacent lanes are empty or not. Hence, the dedicated space to aisles should be considered as permanent accessibility waste in the layout design problem.

<figure><img src="/wp-content/uploads/2019/07/Block-depth-width-trade-off.jpg" alt="" width="690" height="618" loading="lazy" decoding="async"><figcaption>Figure 3. The trade-off that the lane depth model optimizes</figcaption></figure>

In the paper, we proposed a new model to estimate the total waste of storage space as a function of bay depths and the number of aisles in the layout. We then developed a mixed integer programming model to find the optimal number of aisles and bay depths that minimize the total waste of storage space in the warehouse. Our model maximizes utilization of the storage space by allowing different bay depths and assigning SKUs to their preferred depth. We found that the proposed mathematical model is hard to solve optimally for industrial-sized problems. Hence, we developed various analytical approaches to tighten the lower bound of the LP-relaxation and break problem symmetry. The resulting model could solve large-sized test problems with relatively small optimality gap.

You will find a detailed presentation of the model and the solution approach in the paper along with a simulation analysis and exhaustive numerical experiments on the computational performance of the solution approach. You can access the paper from [here](https://www.researchgate.net/publication/329078265_Space-efficient_Layouts_for_Block_Stacking_Warehouses) or the journal [website](https://doi.org/10.1080/24725854.2018.1539280).
