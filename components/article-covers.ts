export type ArticleCover = { src: string; alt: string };

export const articleCovers: Record<string, ArticleCover> = {
  'esg-investitionen': {
    src: 'https://source.unsplash.com/1200x675/?renewable,wind-turbine,green-energy',
    alt: 'Windräder und Solarfelder als Symbol für nachhaltige Investments',
  },
  'kryptowaehrungen-neue-aera': {
    src: 'https://source.unsplash.com/1200x675/?cryptocurrency,bitcoin,blockchain',
    alt: 'Krypto-Münzen und digitale Charts als Symbol für Kryptowährungen',
  },
  'marktanalyse-zinspolitik': {
    src: 'https://source.unsplash.com/1200x675/?central-bank,finance,interest-rates,markets',
    alt: 'Zentralbank und Marktgraphen als Symbol für Zinspolitik und Märkte',
  },
  'technische-analyse-grundlagen': {
    src: 'https://source.unsplash.com/1200x675/?stock,chart,technical,analysis,candlestick',
    alt: 'Candlestick-Chart auf Monitor als Symbol für Technische Analyse',
  },
  'psychologie-des-handels': {
    src: 'https://source.unsplash.com/1200x675/?trader,focus,psychology,stock-market',
    alt: 'Trader konzentriert am Bildschirm als Symbol für Trading-Psychologie',
  },
  portfoliodiversifikation: {
    src: 'https://source.unsplash.com/1200x675/?portfolio,diversification,investment,assets',
    alt: 'Diversifizierte Vermögenswerte als Symbol für Portfoliodiversifikation',
  },
};
