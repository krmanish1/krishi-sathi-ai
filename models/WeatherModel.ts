export type WeatherModel = {
  temperature?: number;
  feelsLike?: number;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
  condition?: string;
  rainChance?: number;
  forecast?: WeatherForecastModel[];
};

export type WeatherForecastModel = {
  date?: string;
  tempMax?: number;
  tempMin?: number;
  precipitation?: number;
  condition?: string;
};
