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

The main map shows Germany’s 16 states as the primary enumeration units. Neighboring countries are included only as background reference context. A coordinated bar chart provides a second view of the same mapped attribute, allowing users to compare both spatial pattern and ranked magnitude across states.

## Project Theme
The project focuses on socioeconomic development across German states. The project emphasizes regional development and economic patterns using HDI, GDP per capita, unemployment, population, density, and area.

## Story and Analytical Goal
This project examines uneven socioeconomic development across Germany’s 16 states.

Rather than assuming that development can be captured by a single indicator, the visualization allows users to switch among multiple measures including population, density, HDI, GDP per capita, unemployment, and land area.

The goal is to help users identify regional contrasts and outliers. For example, some states are large in area but relatively sparse in population, while others are small but highly urbanized and economically productive. Coordinating the choropleth map with a ranked bar chart makes it easier to compare spatial pattern and numeric magnitude at the same time.

## Data Files
- `germany_16_states_lab2.csv`  
  State-level socioeconomic attribute data for the 16 German states.

- `germany_16_states_lab2.topojson`  
  TopoJSON polygon boundaries for Germany at NUTS Level 1.

- `germany_neighbor_regions_background.topojson`  
  TopoJSON polygons used to build neighboring country background context.

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
4. Dissolve neighboring regional geometry into neighboring country background
5. Create a classed choropleth map for one expressed attribute
6. Draw a coordinated bar chart using the same expressed attribute
7. Sort bars from high to low values for ranked comparison
8. Use coordinated highlighting and tooltip labels for retrieve interaction
9. Redraw the layout responsively on window resize

## Interactions
The final version includes the two major coordinated interaction operators from Week 11:

- **Reexpress**  
  A dropdown menu allows the user to switch between six socioeconomic indicators. When the attribute changes, both the map and bar chart update together.

- **Retrieve**  
  Hovering over a state or its matching bar highlights both views and opens a dynamic label showing the value of the currently selected variable.

## Design Notes
- Germany state polygons are the main thematic layer.
- Neighboring countries are included only as contextual background.
- The projection is fit to Germany only so the study area remains centered and visually prominent.
- The choropleth map uses a quantile classification with five classes, ensuring a balanced visual distribution of states across color categories and supporting comparison of relative ranking.
- The coordinated bar chart complements the map by supporting comparison of magnitude and ranking, which are difficult to interpret from spatial patterns alone.
- The coordinated bar chart uses the same color classification as the map.
- The bar chart is annotated with a dynamic title and a vertical axis.
- Hovering over a state or its corresponding bar highlights both views and displays a tooltip.
- The page is designed to respond to screen resizing, with the map and chart stacking vertically on smaller screens.

## Sources
1. Destatis (German Federal Statistical Office)  
   Regional statistics and federal-state population tables for area, population, and population density.

2. Eurostat / Eurostat GISCO  
   Regional GDP per capita data and regional boundary files.

3. Global Data Lab  
   Subnational HDI estimates for Germany.

4. Bundesagentur für Arbeit  
   Federal-state unemployment statistics.

## Notes
This dataset is a compiled state-level dataset built from multiple authoritative sources. Variables come from different years depending on data availability.

Most indicators are from 2023.  
HDI is from 2022.  
Unemployment is recorded as November 2025 in the current dataset.  
Area is included as a general state land-area measure in square kilometers.

This approach balances comparability and recent availability across the 16 German states.

## How to Run
To run the project correctly, keep the `css`, `js`, `data`, and `lib` folders in the same project structure as provided. Open the project through a local server rather than opening the HTML file directly if your browser blocks local file loading.