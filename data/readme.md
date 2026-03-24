# Education and Economic Patterns Across German States

## Project Description
This project visualizes education and economic patterns across the 16 states of Germany.  
The map combines a Germany state boundary layer with surrounding regional background polygons to provide geographic context. The interface is designed for comparing regional socioeconomic patterns.

## Data Files
- `germany_16_states_lab2.csv`  
  State-level socioeconomic attribute data for the 16 German states.

- `germany_16_states_lab2.topojson`  
  TopoJSON polygon boundaries for Germany at NUTS Level 1.  
  This is the main enumeration unit layer.

- `germany_neighbor_regions_background.topojson`  
  TopoJSON polygons used as a neighboring background context layer.

## Attributes
The CSV file includes the following numerical attributes:
- `population_2023`
- `population_density_2023`
- `hdi_2022`
- `gdp_per_capita_eur_2023`
- `unemployment_rate_nov_2025`

## Methods
This project follows the Week 9 D3 mapping workflow used in class:
1. Load external data using `Promise.all()`
2. Translate TopoJSON to GeoJSON using `topojson.feature()`
3. Create an equal-area projection appropriate for choropleth mapping
4. Create a D3 path generator
5. Draw background polygons and main enumeration units in the browser
6. Add retrieve interaction with hover labels and highlighting

## Design Notes
- The projection is fit only to the Germany state polygons, not the neighboring background.
  This keeps Germany large and centered in the map frame.
- The neighboring polygons are included only as contextual background.
- The graticule is optional and kept visually subtle so that it does not overpower the map.
- Hover interaction provides a coordinated retrieve function through state highlighting and a floating information label.

## Sources
Data Sources

1. Destatis (German Federal Statistical Office)
   Population, area, and population density data for German states.

2. Eurostat (European Statistical Office)
   Regional GDP per capita data (NUTS Level 1).

3. Global Data Lab
   Subnational Human Development Index (HDI) estimates.

4. Bundesagentur für Arbeit (Federal Employment Agency of Germany)
   State-level unemployment rates.

5. Eurostat GISCO
   NUTS Level 1 boundary data (TopoJSON / GeoJSON).

Note:
This dataset is a compiled dataset combining multiple official sources.
Values are drawn from different years (approximately 2022–2025) depending on availability.

## Notes
The dataset used in this project is compiled from multiple authoritative sources.
Although the values are not from a single unified dataset, all attributes are standardized to comparable state-level indicators suitable for choropleth mapping and multivariate analysis.

The dataset combines the most recent available data for each variable.

Most indicators (population, GDP, density) are from 2023.
HDI data is from 2022, as more recent subnational estimates are not available.
Unemployment data is aligned to 2023 for consistency.

This approach balances data availability and comparability across German states.