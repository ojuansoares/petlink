# Build Profiles & Google Maps

## Dev Build (profile: `development`)
- **Keystore**: EAS gerencia (JKS)
- **SHA-1**: `47:99:EA:F6:DB:44:25:2D:39:4A:D5:ED:DD:68:08:B0:91:07:8E:8A`
- **Usar**: Testes no dia a dia
- **Build**: `npx eas build --platform android --profile development`
- **Google Maps**: Adicionar SHA-1 acima na restrição da chave de API

## Release/Play Store (profile: `production`)
- **Keystore**: Próprio (gerar um separado)
- **SHA-1**: Diferente do dev, precisa ver com `npx eas credentials --profile production`
- **Google Maps**: Adicionar SHA-1 de produção na restrição da chave

## Google Cloud
- **Projeto**: petlink-b90a4
- **Chave API**: `AIzaSyDCd8h2shAzU3ejsXO7fB1dunwEWgZsrxs`
- **Billing**: Ativo, conta "Minha conta de faturamento do Maps"
- **Cartão**: Mastercard final 0829
- **US$200/mês grátis** — não vai pagar nada

## Observações
- EAS reusa o mesmo keystore do profile `development` pra todos os builds desse profile
- Sempre que criar um novo profile de build, precisa ver o SHA-1 dele e adicionar na chave do Maps
