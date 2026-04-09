# Socioeconomic Development Across the 16 German States

## Project Overview
This project visualizes regional socioeconomic development across the 16 states of Germany using a coordinated choropleth map and bar chart built with D3.

The application is designed to support comparison of state-level differences in:
- area
- population
- population density
- HDI
- GDP per capita
- unemployment rate

The main map shows Germany’s 16 states as the primary enumeration units, with neighboring regional polygons included as geographic background context. A coordinated bar chart provides a second view of the same mapped attribute, allowing users to compare magnitude and ranking across states.

## Project Theme
The project focuses on socioeconomic development across German states. Although the initial topic idea included education, the available dataset does not contain a direct education variable. Therefore, the project was refined to emphasize broader regional development and economic patterns using HDI, GDP per capita, unemployment, population, density, and area.

## Data Files
- `germany_16_states_lab2.csv`  
  State-level socioeconomic attribute data for the 16 German states.

- `germany_16_states_lab2.topojson`  
  TopoJSON polygon boundaries for Germany at NUTS Level 1.

- `germany_neighbor_regions_background.topojson`  
  TopoJSON polygons used as neighboring geographic background.

## Attributes
The CSV includes the following numerical variables:
- `area_km2`
- `population_2023`
- `population_density_2023`
- `hdi_2022`
- `gdp_per_capita_eur_2023`
- `unemployment_rate_nov_2025`

## Methods
This project follows the D3 coordinated visualization workflow from class:

1. Load external data using `Promise.all()`
2. Convert TopoJSON to GeoJSON using `topojson.feature()`
3. Join CSV attribute data to GeoJSON features using a shared NUTS-1 identifier
4. Create a classed choropleth map for one expressed attribute
5. Draw a coordinated bar chart using the same expressed attribute
6. Sort bars from low to high values
7. Use coordinated highlighting and tooltip labels for retrieve interaction
8. Redraw the layout responsively on window resize

## Design Notes
- Germany state polygons are the main thematic layer.
- Neighboring polygons are included only as contextual background.
- The projection is fit to Germany only so the study area remains centered and prominent.
- The choropleth uses a quantile classification with five classes.
- The coordinated bar chart uses the same color classification as the map.
- The bar chart is annotated with a dynamic title and a vertical axis.
- Hovering over a state or its corresponding bar highlights both views and displays a tooltip.

## Sources
1. Destatis (German Federal Statistical Office)  
   Area, population, and population density data.

2. Eurostat  
   Regional GDP per capita data and GISCO boundary data.

3. Global Data Lab  
   Subnational HDI estimates.

4. Bundesagentur für Arbeit  
   State-level unemployment rates.

## Notes
This dataset is a compiled state-level dataset built from multiple authoritative sources. Variables come from different years depending on data availability.

Most indicators are from 2023.  
HDI is from 2022.  
Unemployment is recorded as November 2025 in the current dataset.

This approach balances comparability and recent availability across the 16 German states.

I used a coordinated bar chart as the secondary view because it provides a clearer ranked comparison of a single expressed attribute across the 16 German states. This supports the choropleth map well and aligns with the coordinated visualization requirements of Activity 10.