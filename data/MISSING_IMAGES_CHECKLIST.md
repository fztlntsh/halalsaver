# Missing Product Images — Live Catalog Checklist

Products in `data/cleaned_dataset.csv` with no real photo yet. Each row already has a **pre-assigned filename** — save your photo under that exact name, no need to retype the product name anywhere.

**Workflow:** save the photo into `frontend/assets/images/` using the filename shown → tell me which filenames you've added → I add them to `manual_image_overrides.json`, re-run `match_product_images.py`, and regenerate this checklist (see `GUIDE.md` §9.1).

⚠️ Filenames here are only valid until this file is regenerated — if the list changes, a product's assigned filename can shift. Get photos matched in (tell me what you've saved) before regenerating.

**Merged rows:** many "missing" products were really just the same item at a different (sometimes nonsensical, e.g. powder detergent labelled "1L") pack size — a side effect of the dataset generator picking units at random. Where a whole group had no photo yet, the redundant rows were removed and folded into one representative row per group; see `data/photo_group_map.json` for exactly which product names each remaining filename also covers once photographed. Where a sibling size was *already* photographed, the missing one was linked straight to it — no new photo needed, nothing to do here.

**Total remaining: 240**  |  **332 photographed/linked, 572 tracked overall**

---

## Household (19/55 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [x] | `PRD-419.jpg` | `Ariel` | `Ariel Detergent Powder Original 1L` |
| [x] | `PRD-420.jpg` | `Ariel` | `Ariel Detergent Powder Original 1kg` |
| [x] | `PRD-421.jpg` | `Ariel` | `Ariel Detergent Powder Original 2L` |
| [x] | `PRD-422.jpg` | `Ariel` | `Ariel Detergent Powder Original 2kg` |
| [x] | `PRD-423.jpg` | `Ariel` | `Ariel Detergent Powder Original 5L` |
| [x] | `PRD-424.jpg` | `Ariel` | `Ariel Liquid Detergent 1L` |
| [x] | `PRD-425.jpg` | `Ariel` | `Ariel Liquid Detergent 1kg` |
| [x] | `PRD-426.jpg` | `Ariel` | `Ariel Liquid Detergent 2L` |
| [x] | `PRD-427.jpg` | `Ariel` | `Ariel Liquid Detergent 2kg` |
| [x] | `PRD-428.jpg` | `Ariel` | `Ariel Liquid Detergent 5L` |
| [ ] | `PRD-429.jpg` | `Attack` | `Attack Detergent Powder 1L` |
| [ ] | `PRD-432.jpg` | `Axion` | `Axion Cream Dishwashing 1L` |
| [ ] | `PRD-437.jpg` | `Baygon` | `Baygon Insecticide Spray 1kg` |
| [ ] | `PRD-442.jpg` | `Breeze` | `Breeze Detergent Powder 1L` |
| [ ] | `PRD-446.jpg` | `Cif` | `Cif Cream Cleanser Lemon 1L` |
| [ ] | `PRD-451.jpg` | `Comfort` | `Comfort Fabric Softener Lilac 1kg` |
| [ ] | `PRD-455.jpg` | `Daia` | `Daia Detergent Powder 1L` |
| [ ] | `PRD-460.jpg` | `Dapur` | `Dapur Heavy Duty Trash Bag 1L` |
| [ ] | `PRD-465.jpg` | `Dettol` | `Dettol Antiseptic Liquid 1L` |
| [ ] | `PRD-469.jpg` | `Dettol` | `Dettol Original Floor Cleaner 1L` |
| [ ] | `PRD-473.jpg` | `Downy` | `Downy Fabric Softener Passion 1L` |
| [ ] | `PRD-477.jpg` | `Fab` | `Fab Detergent Powder 1L` |
| [ ] | `PRD-482.jpg` | `Febreze` | `Febreze Air Freshener Fabric 1kg` |
| [ ] | `PRD-485.jpg` | `Glad` | `Glad Press n Seal 1kg` |
| [ ] | `PRD-490.jpg` | `Glad` | `Glad Trash Bag Large 1L` |
| [ ] | `PRD-495.jpg` | `Harpic` | `Harpic Toilet Cleaner Original 1L` |
| [ ] | `PRD-498.jpg` | `Huggies` | `Huggies Diapers Dry Pants M 1kg` |
| [ ] | `PRD-502.jpg` | `Lion` | `Lion Floor Wiper Sponge Mop 1L` |
| [ ] | `PRD-508.jpg` | `Mama Lemon` | `Mama Lemon Dishwashing Lime 1kg` |
| [ ] | `PRD-512.jpg` | `Mamypoko` | `Mamypoko Diapers Pants L 1L` |
| [ ] | `PRD-517.jpg` | `Mr. Muscle` | `Mr. Muscle Kitchen Cleaner` |
| [ ] | `PRD-522.jpg` | `Nice` | `Nice Toilet Roll 10+2` |
| [ ] | `PRD-525.jpg` | `Party` | `Candle Lilin Birthday 1L` |
| [ ] | `PRD-530.jpg` | `Paseo` | `Paseo Facial Tissue` |
| [ ] | `PRD-536.jpg` | `Reynolds` | `Reynolds Aluminium Foil` |
| [ ] | `PRD-541.jpg` | `Ridsect` | `Ridsect Insektisid Spray` |
| [ ] | `PRD-548.jpg` | `Scotch-Brite` | `Scotch Brite Sponge Scourer` |
| [ ] | `PRD-553.jpg` | `Scotch-Brite` | `Scotch Brite Steel Wool Soap Pad` |
| [ ] | `PRD-559.jpg` | `Scott` | `Scott 1-Ply Toilet Tissue` |
| [ ] | `PRD-565.jpg` | `Shieldtox` | `Shieldtox Mosquito Coil` |
| [ ] | `PRD-570.jpg` | `Softex` | `Softex Tissue Facial` |
| [x] | `PRD-575.jpg` | `Softlan` | `Softlan Fabric Softener Spring Fresh` |
| [x] | `PRD-576.jpg` | `Softlan` | `Softlan Fabric Softener Spring Fresh 1L` |
| [x] | `PRD-577.jpg` | `Softlan` | `Softlan Fabric Softener Spring Fresh 2kg` |
| [x] | `PRD-578.jpg` | `Softlan` | `Softlan Fabric Softener Spring Fresh 500ml` |
| [x] | `PRD-579.jpg` | `Sunlight` | `Sunlight Dishwashing Liquid` |
| [x] | `PRD-580.jpg` | `Sunlight` | `Sunlight Dishwashing Liquid 1L` |
| [x] | `PRD-581.jpg` | `Sunlight` | `Sunlight Dishwashing Liquid 1kg` |
| [x] | `PRD-582.jpg` | `Sunlight` | `Sunlight Dishwashing Liquid 2L` |
| [x] | `PRD-583.jpg` | `Sunlight` | `Sunlight Dishwashing Liquid 5L` |
| [ ] | `PRD-584.jpg` | `Tesco` | `Canister Vacuum Dust Bag 1kg` |
| [ ] | `PRD-588.jpg` | `Tesco` | `Tesco Plastic Wrap` |
| [ ] | `PRD-593.jpg` | `Toilet Duck` | `Toilet Duck Gel Cleaner` |
| [ ] | `PRD-599.jpg` | `Zip` | `Zip Dishwashing Liquid` |
| [ ] | `PRD-605.jpg` | `Ziploc` | `Ziplock Bags Medium` |

## Beverages (27/54 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-610.jpg` | `100 Plus` | `100 Plus Lemon Isotonic Drink 250ml` |
| [ ] | `PRD-614.jpg` | `100 Plus` | `100 Plus Original Isotonic Drink 1.5L` |
| [ ] | `PRD-620.jpg` | `7UP` | `7UP Can 1.5L` |
| [ ] | `PRD-627.jpg` | `Calpis` | `Calpis Water Original 250ml` |
| [ ] | `PRD-634.jpg` | `Coca-Cola` | `Coke Original Can 1L` |
| [ ] | `PRD-640.jpg` | `Dutch Lady` | `Dutch Lady Full Cream Milk 250ml` |
| [ ] | `PRD-645.jpg` | `Dutch Lady` | `Dutch Lady Low Fat Milk 250ml` |
| [ ] | `PRD-651.jpg` | `Dutch Lady` | `Dutch Lady Strawberry Flavoured Milk 1L` |
| [ ] | `PRD-656.jpg` | `Evian` | `Evian Natural Mineral Water 1.5L` |
| [ ] | `PRD-660.jpg` | `HL Milk` | `HL Milk Low Fat 1.5L` |
| [ ] | `PRD-665.jpg` | `Jalen` | `Jalen Carbonated Drink Lime 1.5L` |
| [ ] | `PRD-671.jpg` | `Kickapoo` | `Kickapoo Joy Juice 1L` |
| [ ] | `PRD-676.jpg` | `Livita` | `Livita Energy Drink 1.5L` |
| [ ] | `PRD-680.jpg` | `Marigold` | `Marigold Full Cream UHT Milk 250ml` |
| [ ] | `PRD-685.jpg` | `Milo` | `Milo Activ-Go 3-in-1 Chocolate Drink 1L` |
| [ ] | `PRD-692.jpg` | `Milo` | `Milo Activ-Go Tin 1.5L` |
| [ ] | `PRD-698.jpg` | `Milo` | `Milo Fuze Choc Malt Drink 1.5L` |
| [ ] | `PRD-704.jpg` | `Minute Maid` | `Minute Maid Pulpy Orange 250ml` |
| [ ] | `PRD-709.jpg` | `Monster` | `Monster Energy Original 1L` |
| [ ] | `PRD-715.jpg` | `Nescafe` | `Nescafe 3-in-1 Original` |
| [ ] | `PRD-721.jpg` | `Nescafe` | `Nescafe Ice Blend Original` |
| [ ] | `PRD-727.jpg` | `Nescafe` | `Nescafe Tarik Kaw` |
| [ ] | `PRD-734.jpg` | `Nutrigen` | `Nutrigen Grape Juice` |
| [ ] | `PRD-740.jpg` | `Pepsi` | `Pepsi Original Can` |
| [ ] | `PRD-747.jpg` | `Pokka` | `Pokka Iced Coffee` |
| [ ] | `PRD-754.jpg` | `Power Root` | `Ali Cafe White Coffee 1.5L` |
| [ ] | `PRD-760.jpg` | `Power Root` | `Teh Tarik Power Root` |
| [x] | `PRD-766.jpg` | `Red Bull` | `Red Bull Energy Drink` |
| [x] | `PRD-767.jpg` | `Red Bull` | `Red Bull Energy Drink 250ml` |
| [x] | `PRD-768.jpg` | `Red Bull` | `Red Bull Energy Drink 250ml x6` |
| [x] | `PRD-769.jpg` | `Red Bull` | `Red Bull Energy Drink 2L` |
| [x] | `PRD-770.jpg` | `Red Bull` | `Red Bull Energy Drink 300ml` |
| [x] | `PRD-771.jpg` | `Red Bull` | `Red Bull Energy Drink 300ml x24` |
| [x] | `PRD-772.jpg` | `Tesco` | `Tesco Own Brand Mineral Water` |
| [x] | `PRD-773.jpg` | `Tesco` | `Tesco Own Brand Mineral Water 1L` |
| [x] | `PRD-774.jpg` | `Tesco` | `Tesco Own Brand Mineral Water 250ml` |
| [x] | `PRD-775.jpg` | `Tesco` | `Tesco Own Brand Mineral Water 300ml` |
| [x] | `PRD-776.jpg` | `Tesco` | `Tesco Own Brand Mineral Water 325ml` |
| [x] | `PRD-777.jpg` | `Tesco` | `Tesco Own Brand Mineral Water 500ml` |
| [x] | `PRD-778.jpg` | `Tesco` | `Tesco Own Brand Mineral Water 600ml` |
| [x] | `PRD-779.jpg` | `Twister` | `Twister Orange Fizzy` |
| [x] | `PRD-780.jpg` | `Twister` | `Twister Orange Fizzy 1.5L` |
| [x] | `PRD-781.jpg` | `Twister` | `Twister Orange Fizzy 1L` |
| [x] | `PRD-782.jpg` | `Twister` | `Twister Orange Fizzy 250ml x6` |
| [x] | `PRD-783.jpg` | `Twister` | `Twister Orange Fizzy 2L` |
| [x] | `PRD-784.jpg` | `Twister` | `Twister Orange Fizzy 300ml x24` |
| [x] | `PRD-785.jpg` | `Twister` | `Twister Orange Fizzy 600ml` |
| [x] | `PRD-786.jpg` | `Yakult` | `Yakult Original` |
| [x] | `PRD-787.jpg` | `Yakult` | `Yakult Original 1.5L` |
| [x] | `PRD-788.jpg` | `Yakult` | `Yakult Original 1L` |
| [x] | `PRD-789.jpg` | `Yakult` | `Yakult Original 250ml` |
| [x] | `PRD-790.jpg` | `Yakult` | `Yakult Original 250ml x6` |
| [x] | `PRD-791.jpg` | `Yakult` | `Yakult Original 2L` |
| [x] | `PRD-792.jpg` | `Yakult` | `Yakult Original 300ml x24` |

## Personal Care (166/166 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [x] | `PRD-793.jpg` | `Axe` | `Axe Dark Temptation Deodorant 200ml` |
| [x] | `PRD-794.jpg` | `Axe` | `Axe Dark Temptation Deodorant 250ml` |
| [x] | `PRD-795.jpg` | `Axe` | `Axe Dark Temptation Deodorant 400ml` |
| [x] | `PRD-796.jpg` | `BIC` | `BIC Disposable Shaver 150ml` |
| [x] | `PRD-797.jpg` | `BIC` | `BIC Disposable Shaver 200ml` |
| [x] | `PRD-798.jpg` | `BIC` | `BIC Disposable Shaver 250ml` |
| [x] | `PRD-799.jpg` | `Brylcreem` | `Brylcreem Original Hair Cream 100ml` |
| [x] | `PRD-800.jpg` | `Brylcreem` | `Brylcreem Original Hair Cream 150ml` |
| [x] | `PRD-801.jpg` | `Brylcreem` | `Brylcreem Original Hair Cream 200ml` |
| [x] | `PRD-802.jpg` | `Brylcreem` | `Brylcreem Original Hair Cream 250ml` |
| [x] | `PRD-803.jpg` | `Carefree` | `Carefree Panty Liner Regular 100ml` |
| [x] | `PRD-804.jpg` | `Carefree` | `Carefree Panty Liner Regular 150ml` |
| [x] | `PRD-805.jpg` | `Carefree` | `Carefree Panty Liner Regular 200ml` |
| [x] | `PRD-806.jpg` | `Carefree` | `Carefree Panty Liner Regular 400ml` |
| [x] | `PRD-807.jpg` | `Carefree` | `Carefree Panty Liner Regular 500g` |
| [x] | `PRD-808.jpg` | `Clear` | `Clear Cool Sport Shampoo 200ml` |
| [x] | `PRD-809.jpg` | `Clear` | `Clear Cool Sport Shampoo 250ml` |
| [x] | `PRD-810.jpg` | `Clear` | `Clear Cool Sport Shampoo 400ml` |
| [x] | `PRD-811.jpg` | `Clear` | `Clear Cool Sport Shampoo 500g` |
| [x] | `PRD-812.jpg` | `Darlie` | `Darlie All Shiny White 100ml` |
| [x] | `PRD-813.jpg` | `Darlie` | `Darlie All Shiny White 400ml` |
| [x] | `PRD-814.jpg` | `Darlie` | `Darlie All Shiny White 500g` |
| [x] | `PRD-815.jpg` | `Darlie` | `Darlie Double Action 150ml` |
| [x] | `PRD-816.jpg` | `Darlie` | `Darlie Double Action 200ml` |
| [x] | `PRD-817.jpg` | `Darlie` | `Darlie Double Action 250ml` |
| [x] | `PRD-818.jpg` | `Darlie` | `Darlie Double Action 400ml` |
| [x] | `PRD-819.jpg` | `Dettol` | `Dettol Original Bar Soap 400ml` |
| [x] | `PRD-820.jpg` | `Dettol` | `Dettol Original Bar Soap 500g` |
| [x] | `PRD-821.jpg` | `Dettol` | `Dettol Original Body Wash 100ml` |
| [x] | `PRD-822.jpg` | `Dettol` | `Dettol Original Body Wash 150ml` |
| [x] | `PRD-823.jpg` | `Dettol` | `Dettol Original Body Wash 200ml` |
| [x] | `PRD-824.jpg` | `Dettol` | `Dettol Original Body Wash 250ml` |
| [x] | `PRD-825.jpg` | `Dove` | `Dove Beauty Cream Women Deodorant 100ml` |
| [x] | `PRD-826.jpg` | `Dove` | `Dove Beauty Cream Women Deodorant 150ml` |
| [x] | `PRD-827.jpg` | `Dove` | `Dove Beauty Cream Women Deodorant 200ml` |
| [x] | `PRD-828.jpg` | `Dove` | `Dove Beauty Cream Women Deodorant 500g` |
| [x] | `PRD-829.jpg` | `Dove` | `Dove Moisturising Shampoo 100ml` |
| [x] | `PRD-830.jpg` | `Dove` | `Dove Moisturising Shampoo 150ml` |
| [x] | `PRD-831.jpg` | `Dove` | `Dove Moisturising Shampoo 250ml` |
| [x] | `PRD-832.jpg` | `Dove` | `Dove Moisturising Shampoo 400ml` |
| [x] | `PRD-833.jpg` | `Dove` | `Dove Moisturising Shampoo 500g` |
| [x] | `PRD-834.jpg` | `Fa` | `Fa Women Deodorant Aqua 100ml` |
| [x] | `PRD-835.jpg` | `Fa` | `Fa Women Deodorant Aqua 150ml` |
| [x] | `PRD-836.jpg` | `Fa` | `Fa Women Deodorant Aqua 400ml` |
| [x] | `PRD-837.jpg` | `Fa` | `Fa Women Deodorant Aqua 500g` |
| [x] | `PRD-838.jpg` | `Gatsby` | `Gatsby Styling Wax Mat & Hard 150ml` |
| [x] | `PRD-839.jpg` | `Gatsby` | `Gatsby Styling Wax Mat & Hard 200ml` |
| [x] | `PRD-840.jpg` | `Gatsby` | `Gatsby Styling Wax Mat & Hard 250ml` |
| [x] | `PRD-841.jpg` | `Gatsby` | `Gatsby Styling Wax Mat & Hard 400ml` |
| [x] | `PRD-842.jpg` | `Gillette` | `Gillette Fusion Razor 100ml` |
| [x] | `PRD-843.jpg` | `Gillette` | `Gillette Fusion Razor 150ml` |
| [x] | `PRD-844.jpg` | `Gillette` | `Gillette Fusion Razor 200ml` |
| [x] | `PRD-845.jpg` | `Gillette` | `Gillette Fusion Razor 250ml` |
| [x] | `PRD-846.jpg` | `Gillette` | `Gillette Fusion Razor 400ml` |
| [x] | `PRD-847.jpg` | `Gillette` | `Gillette Fusion Razor 500g` |
| [x] | `PRD-848.jpg` | `Gillette` | `Gillette Mach3 Razor 100ml` |
| [x] | `PRD-849.jpg` | `Gillette` | `Gillette Mach3 Razor 150ml` |
| [x] | `PRD-850.jpg` | `Gillette` | `Gillette Mach3 Razor 200ml` |
| [x] | `PRD-851.jpg` | `Gillette` | `Gillette Mach3 Razor 500g` |
| [x] | `PRD-852.jpg` | `Hazeline` | `Hazeline Snow Moisturiser 100ml` |
| [x] | `PRD-853.jpg` | `Hazeline` | `Hazeline Snow Moisturiser 150ml` |
| [x] | `PRD-854.jpg` | `Hazeline` | `Hazeline Snow Moisturiser 250ml` |
| [x] | `PRD-855.jpg` | `Hazeline` | `Hazeline Snow Moisturiser 400ml` |
| [x] | `PRD-856.jpg` | `Hazeline` | `Hazeline Snow Moisturiser 500g` |
| [x] | `PRD-857.jpg` | `Head & Shoulders` | `Head & Shoulders Classic Clean 100ml` |
| [x] | `PRD-858.jpg` | `Head & Shoulders` | `Head & Shoulders Classic Clean 200ml` |
| [x] | `PRD-859.jpg` | `Head & Shoulders` | `Head & Shoulders Classic Clean 250ml` |
| [x] | `PRD-860.jpg` | `Head & Shoulders` | `Head & Shoulders Classic Clean 400ml` |
| [x] | `PRD-861.jpg` | `Head & Shoulders` | `Head & Shoulders Classic Clean 500g` |
| [x] | `PRD-862.jpg` | `Kotex` | `Kotex Ultra Thin Pads 100ml` |
| [x] | `PRD-863.jpg` | `Kotex` | `Kotex Ultra Thin Pads 150ml` |
| [x] | `PRD-864.jpg` | `Kotex` | `Kotex Ultra Thin Pads 250ml` |
| [x] | `PRD-865.jpg` | `Kotex` | `Kotex Ultra Thin Pads 400ml` |
| [x] | `PRD-866.jpg` | `Kotex` | `Kotex Ultra Thin Pads 500g` |
| [x] | `PRD-867.jpg` | `Laurier` | `Laurier Active Body Fit 100ml` |
| [x] | `PRD-868.jpg` | `Laurier` | `Laurier Active Body Fit 150ml` |
| [x] | `PRD-869.jpg` | `Laurier` | `Laurier Active Body Fit 200ml` |
| [x] | `PRD-870.jpg` | `Laurier` | `Laurier Active Body Fit 250ml` |
| [x] | `PRD-871.jpg` | `Laurier` | `Laurier Active Body Fit 500g` |
| [x] | `PRD-872.jpg` | `Lifebuoy` | `Lifebuoy Germ Protection Bar Soap 100ml` |
| [x] | `PRD-873.jpg` | `Lifebuoy` | `Lifebuoy Germ Protection Bar Soap 150ml` |
| [x] | `PRD-874.jpg` | `Lifebuoy` | `Lifebuoy Germ Protection Bar Soap 200ml` |
| [x] | `PRD-875.jpg` | `Lifebuoy` | `Lifebuoy Germ Protection Bar Soap 250ml` |
| [x] | `PRD-876.jpg` | `Lifebuoy` | `Lifebuoy Total 10 Body Wash 200ml` |
| [x] | `PRD-877.jpg` | `Lifebuoy` | `Lifebuoy Total 10 Body Wash 250ml` |
| [x] | `PRD-878.jpg` | `Lifebuoy` | `Lifebuoy Total 10 Body Wash 400ml` |
| [x] | `PRD-879.jpg` | `Lifebuoy` | `Lifebuoy Total 10 Body Wash 500g` |
| [x] | `PRD-880.jpg` | `Listerine` | `Listerine Cool Mint Mouthwash 150ml` |
| [x] | `PRD-881.jpg` | `Listerine` | `Listerine Cool Mint Mouthwash 200ml` |
| [x] | `PRD-882.jpg` | `Listerine` | `Listerine Cool Mint Mouthwash 250ml` |
| [x] | `PRD-883.jpg` | `Listerine` | `Listerine Cool Mint Mouthwash 400ml` |
| [x] | `PRD-884.jpg` | `Listerine` | `Listerine Cool Mint Mouthwash 500g` |
| [x] | `PRD-885.jpg` | `Lux` | `Lux Soft Rose Body Wash 100ml` |
| [x] | `PRD-886.jpg` | `Lux` | `Lux Soft Rose Body Wash 150ml` |
| [x] | `PRD-887.jpg` | `Nivea` | `Nivea Body Lotion Original` |
| [x] | `PRD-888.jpg` | `Nivea` | `Nivea Body Lotion Original 100ml` |
| [x] | `PRD-889.jpg` | `Nivea` | `Nivea Body Lotion Original 150ml` |
| [x] | `PRD-890.jpg` | `Nivea` | `Nivea Body Lotion Original 200ml` |
| [x] | `PRD-891.jpg` | `Nivea` | `Nivea Body Lotion Original 250ml` |
| [x] | `PRD-892.jpg` | `Nivea` | `Nivea Body Lotion Original 400ml` |
| [x] | `PRD-893.jpg` | `Nivea` | `Nivea Body Lotion Original 500g` |
| [x] | `PRD-894.jpg` | `Nivea` | `Nivea Men Ice Cool Deodorant` |
| [x] | `PRD-895.jpg` | `Nivea` | `Nivea Men Ice Cool Deodorant 100ml` |
| [x] | `PRD-896.jpg` | `Nivea` | `Nivea Men Ice Cool Deodorant 400ml` |
| [x] | `PRD-897.jpg` | `Nivea` | `Nivea Men Ice Cool Deodorant 500g` |
| [x] | `PRD-898.jpg` | `Oral-B` | `Oral B Toothbrush Soft` |
| [x] | `PRD-899.jpg` | `Oral-B` | `Oral B Toothbrush Soft 150ml` |
| [x] | `PRD-900.jpg` | `Oral-B` | `Oral B Toothbrush Soft 200ml` |
| [x] | `PRD-901.jpg` | `Oral-B` | `Oral B Toothbrush Soft 250ml` |
| [x] | `PRD-902.jpg` | `Oral-B` | `Oral B Toothbrush Soft 400ml` |
| [x] | `PRD-903.jpg` | `Oral-B` | `Oral B Toothbrush Soft 500g` |
| [x] | `PRD-904.jpg` | `Palmolive` | `Palmolive Naturals Milk Body Wash` |
| [x] | `PRD-905.jpg` | `Palmolive` | `Palmolive Naturals Milk Body Wash 100ml` |
| [x] | `PRD-906.jpg` | `Palmolive` | `Palmolive Naturals Milk Body Wash 150ml` |
| [x] | `PRD-907.jpg` | `Palmolive` | `Palmolive Naturals Milk Body Wash 250ml` |
| [x] | `PRD-908.jpg` | `Palmolive` | `Palmolive Naturals Milk Body Wash 400ml` |
| [x] | `PRD-909.jpg` | `Palmolive` | `Palmolive Naturals Milk Body Wash 500g` |
| [x] | `PRD-910.jpg` | `Pantene` | `Pantene Anti-Dandruff Shampoo` |
| [x] | `PRD-911.jpg` | `Pantene` | `Pantene Anti-Dandruff Shampoo 200ml` |
| [x] | `PRD-912.jpg` | `Pantene` | `Pantene Anti-Dandruff Shampoo 250ml` |
| [x] | `PRD-913.jpg` | `Pantene` | `Pantene Anti-Dandruff Shampoo 400ml` |
| [x] | `PRD-914.jpg` | `Pantene` | `Pantene Anti-Dandruff Shampoo 500g` |
| [x] | `PRD-915.jpg` | `Pantene` | `Pantene Smooth Shampoo` |
| [x] | `PRD-916.jpg` | `Pantene` | `Pantene Smooth Shampoo 150ml` |
| [x] | `PRD-917.jpg` | `Pantene` | `Pantene Smooth Shampoo 200ml` |
| [x] | `PRD-918.jpg` | `Pantene` | `Pantene Smooth Shampoo 250ml` |
| [x] | `PRD-919.jpg` | `Pantene` | `Pantene Smooth Shampoo 400ml` |
| [x] | `PRD-920.jpg` | `Pantene` | `Pantene Smooth Shampoo 500g` |
| [x] | `PRD-921.jpg` | `Pond's` | `Pond's White Beauty BB Cream` |
| [x] | `PRD-922.jpg` | `Pond's` | `Pond's White Beauty BB Cream 150ml` |
| [x] | `PRD-923.jpg` | `Pond's` | `Pond's White Beauty BB Cream 200ml` |
| [x] | `PRD-924.jpg` | `Pond's` | `Pond's White Beauty BB Cream 250ml` |
| [x] | `PRD-925.jpg` | `Pond's` | `Pond's White Beauty BB Cream 400ml` |
| [x] | `PRD-926.jpg` | `Rexona` | `Rexona Men Sport Deodorant` |
| [x] | `PRD-927.jpg` | `Rexona` | `Rexona Men Sport Deodorant 150ml` |
| [x] | `PRD-928.jpg` | `Rexona` | `Rexona Men Sport Deodorant 200ml` |
| [x] | `PRD-929.jpg` | `Rexona` | `Rexona Men Sport Deodorant 250ml` |
| [x] | `PRD-930.jpg` | `Rexona` | `Rexona Men Sport Deodorant 400ml` |
| [x] | `PRD-931.jpg` | `Savlon` | `Savlon Antiseptic Soap` |
| [x] | `PRD-932.jpg` | `Savlon` | `Savlon Antiseptic Soap 150ml` |
| [x] | `PRD-933.jpg` | `Savlon` | `Savlon Antiseptic Soap 200ml` |
| [x] | `PRD-934.jpg` | `Savlon` | `Savlon Antiseptic Soap 250ml` |
| [x] | `PRD-935.jpg` | `Savlon` | `Savlon Antiseptic Soap 400ml` |
| [x] | `PRD-936.jpg` | `Sunsilk` | `Sunsilk Soft & Smooth Shampoo` |
| [x] | `PRD-937.jpg` | `Sunsilk` | `Sunsilk Soft & Smooth Shampoo 150ml` |
| [x] | `PRD-938.jpg` | `Sunsilk` | `Sunsilk Soft & Smooth Shampoo 200ml` |
| [x] | `PRD-939.jpg` | `Sunsilk` | `Sunsilk Soft & Smooth Shampoo 250ml` |
| [x] | `PRD-940.jpg` | `Sunsilk` | `Sunsilk Soft & Smooth Shampoo 400ml` |
| [x] | `PRD-941.jpg` | `Sunsilk` | `Sunsilk Soft & Smooth Shampoo 500g` |
| [x] | `PRD-942.jpg` | `Systema` | `Systema Toothbrush Medium` |
| [x] | `PRD-943.jpg` | `Systema` | `Systema Toothbrush Medium 100ml` |
| [x] | `PRD-944.jpg` | `Systema` | `Systema Toothbrush Medium 150ml` |
| [x] | `PRD-945.jpg` | `Systema` | `Systema Toothbrush Medium 250ml` |
| [x] | `PRD-946.jpg` | `Systema` | `Systema Toothbrush Medium 400ml` |
| [x] | `PRD-947.jpg` | `Systema` | `Systema Toothbrush Medium 500g` |
| [x] | `PRD-948.jpg` | `Vaseline` | `Vaseline Intensive Care Lotion` |
| [x] | `PRD-949.jpg` | `Vaseline` | `Vaseline Intensive Care Lotion 200ml` |
| [x] | `PRD-950.jpg` | `Vaseline` | `Vaseline Intensive Care Lotion 250ml` |
| [x] | `PRD-951.jpg` | `Vaseline` | `Vaseline Intensive Care Lotion 400ml` |
| [x] | `PRD-952.jpg` | `Vaseline` | `Vaseline Intensive Care Lotion 500g` |
| [x] | `PRD-953.jpg` | `Veet` | `Veet Hair Removal Cream` |
| [x] | `PRD-954.jpg` | `Veet` | `Veet Hair Removal Cream 100ml` |
| [x] | `PRD-955.jpg` | `Veet` | `Veet Hair Removal Cream 200ml` |
| [x] | `PRD-956.jpg` | `Veet` | `Veet Hair Removal Cream 250ml` |
| [x] | `PRD-957.jpg` | `Veet` | `Veet Hair Removal Cream 400ml` |
| [x] | `PRD-958.jpg` | `Veet` | `Veet Hair Removal Cream 500g` |

## Fresh Produce (120/120 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [x] | `PRD-959.jpg` | `Imported` | `Carrot Australian 1kg` |
| [x] | `PRD-960.jpg` | `Imported` | `Carrot Australian 300g` |
| [x] | `PRD-961.jpg` | `Imported` | `Carrot Australian 500g` |
| [x] | `PRD-962.jpg` | `Imported` | `Grape Green Seedless 1kg` |
| [x] | `PRD-963.jpg` | `Imported` | `Grape Green Seedless 300g` |
| [x] | `PRD-964.jpg` | `Imported` | `Grape Green Seedless 500g` |
| [x] | `PRD-965.jpg` | `Imported` | `Grape Red Seedless 1kg` |
| [x] | `PRD-966.jpg` | `Imported` | `Grape Red Seedless 300g` |
| [x] | `PRD-967.jpg` | `Imported` | `Grape Red Seedless 500g` |
| [x] | `PRD-968.jpg` | `Imported` | `Green Apple Granny Smith 1kg` |
| [x] | `PRD-969.jpg` | `Imported` | `Green Apple Granny Smith 300g` |
| [x] | `PRD-970.jpg` | `Imported` | `Green Apple Granny Smith 500g` |
| [x] | `PRD-971.jpg` | `Imported` | `Mushroom Button` |
| [x] | `PRD-972.jpg` | `Imported` | `Mushroom Button 1kg` |
| [x] | `PRD-973.jpg` | `Imported` | `Mushroom Button 300g` |
| [x] | `PRD-974.jpg` | `Imported` | `Mushroom Button 500g` |
| [x] | `PRD-975.jpg` | `Imported` | `Orange Navel` |
| [x] | `PRD-976.jpg` | `Imported` | `Orange Navel 1kg` |
| [x] | `PRD-977.jpg` | `Imported` | `Orange Navel 300g` |
| [x] | `PRD-978.jpg` | `Imported` | `Orange Navel 500g` |
| [x] | `PRD-979.jpg` | `Imported` | `Potato Australian` |
| [x] | `PRD-980.jpg` | `Imported` | `Potato Australian 1kg` |
| [x] | `PRD-981.jpg` | `Imported` | `Potato Australian 300g` |
| [x] | `PRD-982.jpg` | `Imported` | `Potato Australian 500g` |
| [x] | `PRD-983.jpg` | `Imported` | `Washington Apple Red` |
| [x] | `PRD-984.jpg` | `Imported` | `Washington Apple Red 1kg` |
| [x] | `PRD-985.jpg` | `Imported` | `Washington Apple Red 300g` |
| [x] | `PRD-986.jpg` | `Imported` | `Washington Apple Red 500g` |
| [x] | `PRD-987.jpg` | `Local Farm` | `Bayam Hijau 1kg` |
| [x] | `PRD-988.jpg` | `Local Farm` | `Bayam Hijau 300g` |
| [x] | `PRD-989.jpg` | `Local Farm` | `Bayam Hijau 500g` |
| [x] | `PRD-990.jpg` | `Local Farm` | `Beef Slice Local 1kg` |
| [x] | `PRD-991.jpg` | `Local Farm` | `Beef Slice Local 300g` |
| [x] | `PRD-992.jpg` | `Local Farm` | `Beef Slice Local 500g` |
| [x] | `PRD-993.jpg` | `Local Farm` | `Capsicum Green 1kg` |
| [x] | `PRD-994.jpg` | `Local Farm` | `Capsicum Green 300g` |
| [x] | `PRD-995.jpg` | `Local Farm` | `Capsicum Green 500g` |
| [x] | `PRD-996.jpg` | `Local Farm` | `Cauliflower 1kg` |
| [x] | `PRD-997.jpg` | `Local Farm` | `Cauliflower 300g` |
| [x] | `PRD-998.jpg` | `Local Farm` | `Cauliflower 500g` |
| [x] | `PRD-999.jpg` | `Local Farm` | `Chicken Breast Fresh 1kg` |
| [x] | `PRD-1000.jpg` | `Local Farm` | `Chicken Breast Fresh 300g` |
| [x] | `PRD-1001.jpg` | `Local Farm` | `Chicken Breast Fresh 500g` |
| [x] | `PRD-1002.jpg` | `Local Farm` | `Chicken Drumstick Fresh 1kg` |
| [x] | `PRD-1003.jpg` | `Local Farm` | `Chicken Drumstick Fresh 300g` |
| [x] | `PRD-1004.jpg` | `Local Farm` | `Chicken Drumstick Fresh 500g` |
| [x] | `PRD-1005.jpg` | `Local Farm` | `Chicken Whole Fresh 1kg` |
| [x] | `PRD-1006.jpg` | `Local Farm` | `Chicken Whole Fresh 300g` |
| [x] | `PRD-1007.jpg` | `Local Farm` | `Chicken Whole Fresh 500g` |
| [x] | `PRD-1008.jpg` | `Local Farm` | `Chilli Red Large 1kg` |
| [x] | `PRD-1009.jpg` | `Local Farm` | `Chilli Red Large 300g` |
| [x] | `PRD-1010.jpg` | `Local Farm` | `Chilli Red Large 500g` |
| [x] | `PRD-1011.jpg` | `Local Farm` | `Corn Jagung Manis 1kg` |
| [x] | `PRD-1012.jpg` | `Local Farm` | `Corn Jagung Manis 300g` |
| [x] | `PRD-1013.jpg` | `Local Farm` | `Corn Jagung Manis 500g` |
| [x] | `PRD-1014.jpg` | `Local Farm` | `Dragon Fruit Red 1kg` |
| [x] | `PRD-1015.jpg` | `Local Farm` | `Dragon Fruit Red 300g` |
| [x] | `PRD-1016.jpg` | `Local Farm` | `Dragon Fruit Red 500g` |
| [x] | `PRD-1017.jpg` | `Local Farm` | `Dragon Fruit White 1kg` |
| [x] | `PRD-1018.jpg` | `Local Farm` | `Dragon Fruit White 300g` |
| [x] | `PRD-1019.jpg` | `Local Farm` | `Dragon Fruit White 500g` |
| [x] | `PRD-1020.jpg` | `Local Farm` | `Durian D24 1kg` |
| [x] | `PRD-1021.jpg` | `Local Farm` | `Durian D24 300g` |
| [x] | `PRD-1022.jpg` | `Local Farm` | `Durian D24 500g` |
| [x] | `PRD-1023.jpg` | `Local Farm` | `Durian Musang King 1kg` |
| [x] | `PRD-1024.jpg` | `Local Farm` | `Durian Musang King 300g` |
| [x] | `PRD-1025.jpg` | `Local Farm` | `Durian Musang King 500g` |
| [x] | `PRD-1026.jpg` | `Local Farm` | `Egg Grade A 1kg` |
| [x] | `PRD-1027.jpg` | `Local Farm` | `Egg Grade A 300g` |
| [x] | `PRD-1028.jpg` | `Local Farm` | `Egg Omega-3 1kg` |
| [x] | `PRD-1029.jpg` | `Local Farm` | `Egg Omega-3 300g` |
| [x] | `PRD-1030.jpg` | `Local Farm` | `Egg Omega-3 500g` |
| [x] | `PRD-1031.jpg` | `Local Farm` | `Fish Siakap Fresh 1kg` |
| [x] | `PRD-1032.jpg` | `Local Farm` | `Fish Siakap Fresh 300g` |
| [x] | `PRD-1033.jpg` | `Local Farm` | `Fish Siakap Fresh 500g` |
| [x] | `PRD-1034.jpg` | `Local Farm` | `Fish Tilapia Fresh 1kg` |
| [x] | `PRD-1035.jpg` | `Local Farm` | `Fish Tilapia Fresh 300g` |
| [x] | `PRD-1036.jpg` | `Local Farm` | `Fish Tilapia Fresh 500g` |
| [x] | `PRD-1037.jpg` | `Local Farm` | `Honeydew Melon 1kg` |
| [x] | `PRD-1038.jpg` | `Local Farm` | `Honeydew Melon 300g` |
| [x] | `PRD-1039.jpg` | `Local Farm` | `Honeydew Melon 500g` |
| [x] | `PRD-1040.jpg` | `Local Farm` | `Mangosteen 1kg` |
| [x] | `PRD-1041.jpg` | `Local Farm` | `Mangosteen 300g` |
| [x] | `PRD-1042.jpg` | `Local Farm` | `Mangosteen 500g` |
| [x] | `PRD-1043.jpg` | `Local Farm` | `Mushroom Oyster` |
| [x] | `PRD-1044.jpg` | `Local Farm` | `Mushroom Oyster 1kg` |
| [x] | `PRD-1045.jpg` | `Local Farm` | `Mushroom Oyster 300g` |
| [x] | `PRD-1046.jpg` | `Local Farm` | `Mushroom Oyster 500g` |
| [x] | `PRD-1047.jpg` | `Local Farm` | `Mutton Bone-in` |
| [x] | `PRD-1048.jpg` | `Local Farm` | `Mutton Bone-in 1kg` |
| [x] | `PRD-1049.jpg` | `Local Farm` | `Mutton Bone-in 300g` |
| [x] | `PRD-1050.jpg` | `Local Farm` | `Mutton Bone-in 500g` |
| [x] | `PRD-1051.jpg` | `Local Farm` | `Pineapple Morris` |
| [x] | `PRD-1052.jpg` | `Local Farm` | `Pineapple Morris 1kg` |
| [x] | `PRD-1053.jpg` | `Local Farm` | `Pineapple Morris 300g` |
| [x] | `PRD-1054.jpg` | `Local Farm` | `Pineapple Morris 500g` |
| [x] | `PRD-1055.jpg` | `Local Farm` | `Prawn Medium Fresh` |
| [x] | `PRD-1056.jpg` | `Local Farm` | `Prawn Medium Fresh 1kg` |
| [x] | `PRD-1057.jpg` | `Local Farm` | `Prawn Medium Fresh 300g` |
| [x] | `PRD-1058.jpg` | `Local Farm` | `Prawn Medium Fresh 500g` |
| [x] | `PRD-1059.jpg` | `Local Farm` | `Sawi Hijau` |
| [x] | `PRD-1060.jpg` | `Local Farm` | `Sawi Hijau 1kg` |
| [x] | `PRD-1061.jpg` | `Local Farm` | `Sawi Hijau 300g` |
| [x] | `PRD-1062.jpg` | `Local Farm` | `Sawi Hijau 500g` |
| [x] | `PRD-1063.jpg` | `Local Farm` | `Squid Fresh` |
| [x] | `PRD-1064.jpg` | `Local Farm` | `Squid Fresh 1kg` |
| [x] | `PRD-1065.jpg` | `Local Farm` | `Squid Fresh 300g` |
| [x] | `PRD-1066.jpg` | `Local Farm` | `Squid Fresh 500g` |
| [x] | `PRD-1067.jpg` | `Local Farm` | `Tempeh` |
| [x] | `PRD-1068.jpg` | `Local Farm` | `Tempeh 1kg` |
| [x] | `PRD-1069.jpg` | `Local Farm` | `Tempeh 300g` |
| [x] | `PRD-1070.jpg` | `Local Farm` | `Tempeh 500g` |
| [x] | `PRD-1071.jpg` | `Local Farm` | `Tofu Firm` |
| [x] | `PRD-1072.jpg` | `Local Farm` | `Tofu Firm 1kg` |
| [x] | `PRD-1073.jpg` | `Local Farm` | `Tofu Firm 300g` |
| [x] | `PRD-1074.jpg` | `Local Farm` | `Tofu Firm 500g` |
| [x] | `PRD-1075.jpg` | `Local Farm` | `Tofu Silken` |
| [x] | `PRD-1076.jpg` | `Local Farm` | `Tofu Silken 1kg` |
| [x] | `PRD-1077.jpg` | `Local Farm` | `Tofu Silken 300g` |
| [x] | `PRD-1078.jpg` | `Local Farm` | `Tofu Silken 500g` |

## Dairy & Chilled (0/21 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1079.jpg` | `Carnation` | `Carnation Evaporated Milk 125g` |
| [ ] | `PRD-1084.jpg` | `Chesdale` | `Chesdale Processed Cheese 125g` |
| [ ] | `PRD-1090.jpg` | `Dairy Champ` | `Dairy Champ Sweetened Condensed Milk 125g` |
| [ ] | `PRD-1096.jpg` | `Dutch Lady` | `Dutch Lady Pure Farm Milk 125g` |
| [ ] | `PRD-1101.jpg` | `Emborg` | `Emborg Mozzarella Cheese 130g` |
| [ ] | `PRD-1106.jpg` | `Farm Fresh` | `Farm Fresh Low Fat Milk 1L` |
| [ ] | `PRD-1110.jpg` | `Farmhouse` | `Farmhouse Fresh Milk 130g` |
| [ ] | `PRD-1115.jpg` | `Farmhouse` | `Farmhouse UHT Milk Full Cream 125g` |
| [ ] | `PRD-1119.jpg` | `King` | `King Butter Salted 125g` |
| [ ] | `PRD-1125.jpg` | `Kraft` | `Kraft Cheddar Slices 125g` |
| [ ] | `PRD-1131.jpg` | `Lurpak` | `Lurpak Butter Spreadable 125g` |
| [ ] | `PRD-1137.jpg` | `Magnolia` | `Magnolia Pasteurised Milk 125g` |
| [ ] | `PRD-1143.jpg` | `Meadow Gold` | `Meadow Gold Ice Cream Tub Vanilla 125g` |
| [ ] | `PRD-1148.jpg` | `Milkana` | `Milkana Cheese Spread 125g` |
| [ ] | `PRD-1153.jpg` | `Nestle` | `Nestle Coffee-Mate Creamer` |
| [ ] | `PRD-1158.jpg` | `Nestle` | `Nestle Drumstick Vanilla` |
| [ ] | `PRD-1163.jpg` | `Nestle` | `Nestle Fruity Yogurt Strawberry` |
| [ ] | `PRD-1169.jpg` | `Nestle` | `Nestle Natural Set Yogurt` |
| [ ] | `PRD-1176.jpg` | `Philadelphia` | `Philadelphia Cream Cheese` |
| [ ] | `PRD-1182.jpg` | `Puck` | `Puck Cream Cheese Spread` |
| [ ] | `PRD-1188.jpg` | `Wall's` | `Wall's Paddle Pop Chocolate` |

## Cooking Essentials (0/23 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1195.jpg` | `ABC` | `ABC Sambal Oelek 1L` |
| [ ] | `PRD-1201.jpg` | `Adabi` | `Adabi Rempah Kari Ayam 1L` |
| [ ] | `PRD-1205.jpg` | `Adabi` | `Kicap Manis Adabi 250ml` |
| [ ] | `PRD-1208.jpg` | `Angel` | `Angel Yeast Instant Dry Yeast 1L` |
| [ ] | `PRD-1214.jpg` | `Bakers` | `Bakers Vanilla Essence 1L` |
| [ ] | `PRD-1217.jpg` | `Borges` | `Minyak Zaitun Borges 1L` |
| [ ] | `PRD-1222.jpg` | `Cap Kipas Udang` | `Cap Kipas Udang Blachan 1L` |
| [ ] | `PRD-1225.jpg` | `Cap Kipas Udang` | `Kicap Pekat Cap Kipas Udang 1L` |
| [ ] | `PRD-1229.jpg` | `Crisco` | `Crisco Butter Flavour 1L` |
| [ ] | `PRD-1235.jpg` | `HP` | `HP Brown Sauce 1L` |
| [ ] | `PRD-1240.jpg` | `Heinz` | `Heinz Tomato Ketchup 1kg` |
| [ ] | `PRD-1245.jpg` | `Lam Soon` | `Lam Soon Canola Cooking Oil 1L` |
| [ ] | `PRD-1250.jpg` | `Lea & Perrins` | `Worcestershire Sauce Lea Perrins` |
| [ ] | `PRD-1254.jpg` | `Maggi` | `Maggi Pati Ayam Seasoning 1L` |
| [ ] | `PRD-1259.jpg` | `Maggi` | `Maggi Sos Cili 1L` |
| [ ] | `PRD-1264.jpg` | `Maggi` | `Maggi Tomyam Paste 1L` |
| [ ] | `PRD-1269.jpg` | `RHB` | `RHB Flour Plain Tepung` |
| [ ] | `PRD-1275.jpg` | `Rose Brand` | `Rose Brand Salt Table` |
| [ ] | `PRD-1281.jpg` | `SCS` | `SCS Butter Salted` |
| [ ] | `PRD-1286.jpg` | `SCS` | `SCS Unsalted Butter` |
| [ ] | `PRD-1293.jpg` | `Seri Murni` | `Seri Murni Palm Cooking Oil` |
| [ ] | `PRD-1298.jpg` | `Sunco` | `Sunco Cooking Oil` |
| [ ] | `PRD-1302.jpg` | `Yeo's` | `Yeo's Coconut Cream` |

## Canned & Preserved (0/15 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1307.jpg` | `Adabi` | `Adabi Kari Ikan Canned 155g` |
| [ ] | `PRD-1311.jpg` | `Champion` | `Champion Corned Beef 155g` |
| [ ] | `PRD-1316.jpg` | `Golden Circle` | `Golden Circle Peach Slices 155g` |
| [ ] | `PRD-1320.jpg` | `Heinz` | `Heinz Cream of Mushroom Soup 155g` |
| [ ] | `PRD-1324.jpg` | `Hershey's` | `Hershey's Chocolate Spread 155g` |
| [ ] | `PRD-1328.jpg` | `Jif` | `Jif Creamy Peanut Butter 155g` |
| [ ] | `PRD-1334.jpg` | `Kia Ora` | `Kia Ora Orange Jam 155g` |
| [ ] | `PRD-1339.jpg` | `Magi` | `Magi Macaroni Elbow Pasta 300g` |
| [ ] | `PRD-1343.jpg` | `Marriott` | `Marriott Strawberry Jam 155g` |
| [ ] | `PRD-1349.jpg` | `Sara Lee` | `Sara Lee Strawberry Jam` |
| [ ] | `PRD-1354.jpg` | `Skippy` | `Skippy Peanut Butter Creamy` |
| [ ] | `PRD-1361.jpg` | `Tesco` | `Tesco Vegetable Soup` |
| [ ] | `PRD-1367.jpg` | `Tiger Brand` | `Tiger Brand Meat Luncheon` |
| [ ] | `PRD-1373.jpg` | `Tulip` | `Tulip Pork Luncheon Meat` |
| [ ] | `PRD-1379.jpg` | `Yeo's` | `Yeos Green Pea Canned` |

## Health & Wellness (0/57 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1385.jpg` | `Appeton` | `Appeton Vitamin C Chewable 100 tablets` |
| [ ] | `PRD-1386.jpg` | `Appeton` | `Appeton Vitamin C Chewable 250ml` |
| [ ] | `PRD-1387.jpg` | `Appeton` | `Appeton Vitamin C Chewable 30 tablets` |
| [ ] | `PRD-1389.jpg` | `Appeton` | `Appeton Vitamin C Chewable 60 tablets` |
| [ ] | `PRD-1390.jpg` | `Appeton` | `Appeton Weight Gain Chocolate 100 tablets` |
| [ ] | `PRD-1391.jpg` | `Appeton` | `Appeton Weight Gain Chocolate 250ml` |
| [ ] | `PRD-1392.jpg` | `Appeton` | `Appeton Weight Gain Chocolate 30 tablets` |
| [ ] | `PRD-1393.jpg` | `Appeton` | `Appeton Weight Gain Chocolate 60 tablets` |
| [ ] | `PRD-1394.jpg` | `Axe Brand` | `Axe Brand Universal Oil 100 tablets` |
| [ ] | `PRD-1395.jpg` | `Axe Brand` | `Axe Brand Universal Oil 250ml` |
| [ ] | `PRD-1396.jpg` | `Axe Brand` | `Axe Brand Universal Oil 30 tablets` |
| [ ] | `PRD-1398.jpg` | `Axe Brand` | `Axe Brand Universal Oil 60 tablets` |
| [ ] | `PRD-1399.jpg` | `Biogesic` | `Biogesic Paracetamol 500mg 100 tablets` |
| [ ] | `PRD-1400.jpg` | `Biogesic` | `Biogesic Paracetamol 500mg 250ml` |
| [ ] | `PRD-1401.jpg` | `Biogesic` | `Biogesic Paracetamol 500mg 30 tablets` |
| [ ] | `PRD-1403.jpg` | `Biogesic` | `Biogesic Paracetamol 500mg 60 tablets` |
| [ ] | `PRD-1404.jpg` | `Brand's` | `Brands Vita B Complex 100 tablets` |
| [ ] | `PRD-1405.jpg` | `Brand's` | `Brands Vita B Complex 250ml` |
| [ ] | `PRD-1407.jpg` | `Brand's` | `Brands Vita B Complex 60 tablets` |
| [ ] | `PRD-1408.jpg` | `Cap Kapak` | `Minyak Angin Cap Kapak 100 tablets` |
| [ ] | `PRD-1409.jpg` | `Cap Kapak` | `Minyak Angin Cap Kapak 250ml` |
| [ ] | `PRD-1410.jpg` | `Cap Kapak` | `Minyak Angin Cap Kapak 30 tablets` |
| [ ] | `PRD-1411.jpg` | `Cap Kapak` | `Minyak Angin Cap Kapak 60 tablets` |
| [ ] | `PRD-1412.jpg` | `Celeteque` | `Celeteque Moisturizer SPF15 100 tablets` |
| [ ] | `PRD-1413.jpg` | `Celeteque` | `Celeteque Moisturizer SPF15 250ml` |
| [ ] | `PRD-1414.jpg` | `Celeteque` | `Celeteque Moisturizer SPF15 30 tablets` |
| [ ] | `PRD-1416.jpg` | `Celeteque` | `Celeteque Moisturizer SPF15 60 tablets` |
| [ ] | `PRD-1417.jpg` | `Eno` | `Antacid Eno Fruity 100 tablets` |
| [ ] | `PRD-1418.jpg` | `Eno` | `Antacid Eno Fruity 250ml` |
| [ ] | `PRD-1419.jpg` | `Eno` | `Antacid Eno Fruity 30 tablets` |
| [ ] | `PRD-1421.jpg` | `Eno` | `Antacid Eno Fruity 60 tablets` |
| [ ] | `PRD-1422.jpg` | `Enrich` | `Enrich Multivitamin Adult 100 tablets` |
| [ ] | `PRD-1423.jpg` | `Enrich` | `Enrich Multivitamin Adult 30 tablets` |
| [ ] | `PRD-1424.jpg` | `Enrich` | `Enrich Multivitamin Adult 60 tablets` |
| [ ] | `PRD-1425.jpg` | `Panadol` | `Panadol Extra Tablets` |
| [ ] | `PRD-1426.jpg` | `Panadol` | `Panadol Extra Tablets 100 tablets` |
| [ ] | `PRD-1429.jpg` | `Panadol` | `Panadol Extra Tablets 60 tablets` |
| [ ] | `PRD-1430.jpg` | `Panadol` | `Panadol Regular Tablets` |
| [ ] | `PRD-1431.jpg` | `Panadol` | `Panadol Regular Tablets 100 tablets` |
| [ ] | `PRD-1433.jpg` | `Panadol` | `Panadol Regular Tablets 30 tablets` |
| [ ] | `PRD-1435.jpg` | `Panadol` | `Panadol Regular Tablets 60 tablets` |
| [ ] | `PRD-1436.jpg` | `Scott's` | `Scott's Emulsion Pure Cod Liver` |
| [ ] | `PRD-1437.jpg` | `Scott's` | `Scott's Emulsion Pure Cod Liver 100 tablets` |
| [ ] | `PRD-1439.jpg` | `Scott's` | `Scott's Emulsion Pure Cod Liver 30 tablets` |
| [ ] | `PRD-1441.jpg` | `Scott's` | `Scott's Emulsion Pure Cod Liver 60 tablets` |
| [ ] | `PRD-1442.jpg` | `Scotts` | `Scotts DHA Emulsion Orange` |
| [ ] | `PRD-1443.jpg` | `Scotts` | `Scotts DHA Emulsion Orange 100 tablets` |
| [ ] | `PRD-1445.jpg` | `Scotts` | `Scotts DHA Emulsion Orange 30 tablets` |
| [ ] | `PRD-1447.jpg` | `Scotts` | `Scotts DHA Emulsion Orange 60 tablets` |
| [ ] | `PRD-1448.jpg` | `Tiger Balm` | `Tiger Balm Red Ointment` |
| [ ] | `PRD-1449.jpg` | `Tiger Balm` | `Tiger Balm Red Ointment 100 tablets` |
| [ ] | `PRD-1451.jpg` | `Tiger Balm` | `Tiger Balm Red Ointment 30 tablets` |
| [ ] | `PRD-1453.jpg` | `Tiger Balm` | `Tiger Balm Red Ointment 60 tablets` |
| [ ] | `PRD-1454.jpg` | `Watsons` | `Natural Honey Face Mask` |
| [ ] | `PRD-1455.jpg` | `Watsons` | `Natural Honey Face Mask 100 tablets` |
| [ ] | `PRD-1457.jpg` | `Watsons` | `Natural Honey Face Mask 30 tablets` |
| [ ] | `PRD-1459.jpg` | `Watsons` | `Natural Honey Face Mask 60 tablets` |

## Snacks (0/15 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1460.jpg` | `Apollo` | `Apollo Layer Cake Chocolate 100g` |
| [ ] | `PRD-1462.jpg` | `Apollo` | `Apollo Swiss Roll Chocolate 100g` |
| [ ] | `PRD-1467.jpg` | `Cadbury` | `Cadbury Crunchie 100g` |
| [ ] | `PRD-1470.jpg` | `Ferrero Rocher` | `Ferrero Rocher 3 pieces 100g` |
| [ ] | `PRD-1476.jpg` | `Hershey's` | `Hershey's Kisses Milk Chocolate 250g` |
| [ ] | `PRD-1479.jpg` | `Jacob's` | `Jacob's Cream Crackers 100g` |
| [ ] | `PRD-1483.jpg` | `KitKat` | `KitKat 4 Fingers 150g` |
| [ ] | `PRD-1488.jpg` | `Lay's` | `Lays Barbecue Flavour 100g` |
| [ ] | `PRD-1493.jpg` | `Lay's` | `Lays Classic Potato Chips 200g` |
| [ ] | `PRD-1498.jpg` | `Malkist` | `Malkist Crackers 100g` |
| [ ] | `PRD-1502.jpg` | `Mamee` | `Mamee O-Corn Snack 100g` |
| [ ] | `PRD-1506.jpg` | `Nips` | `Nips Peanuts Coated` |
| [ ] | `PRD-1512.jpg` | `Oishi` | `Oishi Prawn Crackers` |
| [ ] | `PRD-1516.jpg` | `Ritz` | `Ritz Crackers Original` |
| [ ] | `PRD-1521.jpg` | `Toblerone` | `Toblerone Milk Chocolate` |

## Baby & Kids (0/14 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1525.jpg` | `Anmum` | `Anmum Lacta Chocolate 100g` |
| [ ] | `PRD-1529.jpg` | `Cetaphil` | `Cetaphil Baby Gentle Wash 100g` |
| [ ] | `PRD-1532.jpg` | `Enfamil` | `Enfagrow A+ Stage 3 Chocolate 200ml` |
| [ ] | `PRD-1535.jpg` | `Friso` | `Friso Gold Step 3 100g` |
| [ ] | `PRD-1539.jpg` | `Gerber` | `Gerber Puffs Strawberry 200ml` |
| [ ] | `PRD-1542.jpg` | `Heinz` | `Heinz Cereals Rice with Apple 100g` |
| [ ] | `PRD-1545.jpg` | `Huggies` | `Huggies Dry Fit NB Diapers 100g` |
| [ ] | `PRD-1548.jpg` | `Johnson's` | `Johnsons Baby Lotion 200ml` |
| [ ] | `PRD-1551.jpg` | `Johnson's` | `Johnsons Baby Powder 200g` |
| [ ] | `PRD-1555.jpg` | `Mamypoko` | `Mamypoko Newborn Diapers 100g` |
| [ ] | `PRD-1559.jpg` | `Nestle` | `Nestle NAN HA 1` |
| [ ] | `PRD-1564.jpg` | `Pigeon` | `Pigeon Baby Shampoo` |
| [ ] | `PRD-1570.jpg` | `Pigeon` | `Pigeon Baby Wash` |
| [ ] | `PRD-1576.jpg` | `Similac` | `Similac Step 2 Stage 2` |

## Frozen Food (0/13 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1582.jpg` | `Baskin-Robbins` | `Baskin Robbins Pint Vanilla 1kg` |
| [ ] | `PRD-1585.jpg` | `Bird's Eye` | `Birds Eye Fish Fingers 1kg` |
| [ ] | `PRD-1589.jpg` | `Caesar` | `Caesar Fish Cake Seafood 1kg` |
| [ ] | `PRD-1593.jpg` | `Farm's Best` | `Farm's Best Chicken Sausage 1kg` |
| [ ] | `PRD-1597.jpg` | `Haagen-Dazs` | `Haagen-Dazs Vanilla Ice Cream 1kg` |
| [ ] | `PRD-1601.jpg` | `IKEA` | `Ikea Veggie Balls Frozen 200g` |
| [ ] | `PRD-1604.jpg` | `McCain` | `McCain Crinkle Cut Fries 1kg` |
| [ ] | `PRD-1608.jpg` | `Nestle` | `Nestle Drumstick Mini Cones` |
| [ ] | `PRD-1613.jpg` | `Peel Fresh` | `Peel Fresh Frozen Durian Puree` |
| [ ] | `PRD-1618.jpg` | `Pokka` | `Pokka Sorbet Mango` |
| [ ] | `PRD-1623.jpg` | `Simplot` | `Simplot Straight Cut Fries` |
| [ ] | `PRD-1628.jpg` | `VM` | `VM Chicken Frankfurt Sausage` |
| [ ] | `PRD-1633.jpg` | `Wall's` | `Walls Oreo Ice Cream Tub` |

## Rice & Grains (0/12 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1638.jpg` | `Barilla` | `Penne Pasta` |
| [ ] | `PRD-1643.jpg` | `Barilla` | `Spaghetti No 5 Barilla` |
| [ ] | `PRD-1648.jpg` | `Bob Red Mill` | `Bob Red Mill Rolled Oats 10kg` |
| [ ] | `PRD-1652.jpg` | `Cap Ayam` | `Beras Tempatan Biasa 10kg` |
| [ ] | `PRD-1656.jpg` | `Cap Nona` | `Beras Jasmine 5% Broken 10kg` |
| [ ] | `PRD-1660.jpg` | `Golden Grain` | `Golden Grain Mee Kuning 10kg` |
| [ ] | `PRD-1664.jpg` | `Ibumie` | `Ibumie Mi Goreng Penang 10kg` |
| [ ] | `PRD-1668.jpg` | `Kellogg's` | `Kellogg's Corn Flakes 10kg` |
| [ ] | `PRD-1670.jpg` | `Naturel` | `Brown Rice Beras Perang 10kg` |
| [ ] | `PRD-1674.jpg` | `Pagoda` | `Bee Hoon Rice Vermicelli 1kg` |
| [ ] | `PRD-1677.jpg` | `Super Special` | `Super Special Thai Rice` |
| [ ] | `PRD-1682.jpg` | `Tilda` | `Beras Basmati Import 10kg` |

## Bakery (0/7 done)

| Done | Save As | Brand | Product Name |
|---|---|---|---|
| [ ] | `PRD-1686.jpg` | `Gardenia` | `Gardenia Bun Kaya 350g` |
| [ ] | `PRD-1690.jpg` | `Gardenia` | `Gardenia Croissant 350g` |
| [ ] | `PRD-1694.jpg` | `Local Bakery` | `Baguette French Bread 350g` |
| [ ] | `PRD-1698.jpg` | `Local Bakery` | `Kaya Kopitiam Bread 350g` |
| [ ] | `PRD-1702.jpg` | `Local Bakery` | `Roti Benggali Local` |
| [ ] | `PRD-1707.jpg` | `Local Bakery` | `Tart Egg Portuguese` |
| [ ] | `PRD-1712.jpg` | `Tesco` | `Sandwich White Bread Sliced` |
