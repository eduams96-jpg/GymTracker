# GymTracker 🏋️‍♂️

Aplicação móvel moderna de alto rendimento para registo, tracking e evolução de treinos no ginásio (estilo Hevy / Strong).

---

## 🚀 Funcionalidades Principais

1. **Sessão de Treino Ativa (`/active-workout`)**:
   - Temporizador em direto da duração do treino.
   - Registo detalhado por série: **Tipo** (Normal, Aquecimento, Drop set, Falha), **Peso (kg)** e **Repetições**.
   - Valores e marcas da sessão anterior visíveis automaticamente para cada exercício.
   - Botão de validação de série com animação tátil (*haptics*).
   - **Temporizador de Descanso Automático**: Inicia contagem regressiva flutuante (ex: 90s) ao validar cada série, com ajustes rápidos (+30s / -15s).
   - Modal de celebração e resumo com cálculo de volume total levantado e recordes batidos.

2. **Rotinas & Templates (`/index` e `/new-routine`)**:
   - Modelos predefinidos clássicos: *Push*, *Pull*, *Legs* e *Full Body*.
   - Criação e personalização de novas rotinas com seleção rápida de exercícios.
   - Opção de **Treino Livre** sem rotina fixa.

3. **Catálogo de Exercícios & PRs (`/exercises`)**:
   - Biblioteca com exercícios completos em português categorizados por músculo (*Peito*, *Costas*, *Pernas*, *Ombros*, *Bíceps*, *Tríceps*, *Core*).
   - Filtros instantâneos e pesquisa por texto.
   - Ficha de detalhe de cada exercício com estimativa de **1RM** (fórmula Brzycki) e recorde pessoal.
   - Criação de novos exercícios personalizados.

4. **Histórico Detalhado (`/history`)**:
   - Registo cronológico de todos os treinos concluídos com duração, volume total e séries realizadas.
   - Visualização expansível de cada sessão.

5. **Estatísticas & Recordes (`/stats`)**:
   - Total de treinos, volume acumulado em toneladas, horas no ginásio e treinos na semana.
   - Quadro de honra de Recordes Pessoais (PRs).

6. **Local-First & Offline**:
   - 100% funcional sem ligação à internet através de armazenamento persistente com `@react-native-async-storage/async-storage`.

---

## 📱 Como Executar no Telemóvel ou Browser

1. Abre um terminal na pasta do projeto:
   ```bash
   cd C:\Users\WinNAS\.gemini\antigravity\scratch\gym-tracker
   ```

2. Inicia o servidor Expo:
   ```bash
   npm start
   ```

3. **No telemóvel (Android / iPhone)**:
   - Instala a app **Expo Go** (disponível na App Store ou Google Play Store).
   - Aponta a câmara do telemóvel (no iOS) ou abre o scanner do Expo Go (no Android) para o código QR gerado no terminal.
   - O projeto carrega instantaneamente no teu telemóvel com suporte para gestos nativos e vibração!

4. **No Navegador Web**:
   ```bash
   npm run web
   ```
