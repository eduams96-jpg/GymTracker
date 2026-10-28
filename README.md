# GymTracker 🏋️‍♂️

> **Aplicação móvel moderna e de alto rendimento para registo, tracking e evolução de treinos de musculação (estilo Hevy / Strong), 100% offline-first.**

[![Release](https://img.shields.io/badge/Release-v1.2.0-10B981.svg?style=flat-square)](https://github.com/eduams96-jpg/GymTracker/releases)
[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84.svg?style=flat-square&logo=android)](https://github.com/eduams96-jpg/GymTracker/releases)
[![Expo](https://img.shields.io/badge/Expo-SDK_58-000020.svg?style=flat-square&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB.svg?style=flat-square&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org)

---

## 📲 Download do APK (Android)

Podes descarregar o ficheiro APK oficial da versão final pronta a instalar diretamente na secção de [**Releases**](https://github.com/eduams96-jpg/GymTracker/releases):

👉 [**Descarregar GymTracker-v1.2.0.apk**](https://github.com/eduams96-jpg/GymTracker/releases/download/v1.2.0/GymTracker-v1.2.0.apk)

---

## 🚀 Funcionalidades Principais

### 1. ⚡ Treino Ativo Guiado & Experiência Tátil (`/active-workout`)
- **Registo Rápido e Focado**: Valores e cargas da sessão anterior pré-preenchidos como referência (`80kg × 8`).
- **Botão Táctil Inferior de Conclusão Rápida**: Controlos com botões táteis para `+2.5kg / -2.5kg` e `+1 / -1 reps`.
- **Calculadora de Discos Integrada**: Acesso imediato em cada exercício ou no topo para ver exatamente como montar os discos na barra.
- **Séries de Aquecimento Automáticas (+ Aquecimento Auto)**: Gera automaticamente 3 séries progressivas de aproximação (50% × 8, 70% × 4, 85% × 2) arredondadas para 2.5 kg.
- **Temporizador de Descanso Inteligente**: Contagem regressiva automática com alerta sonoro sem interrupção de música (áudio ducking) e vibrações hápticas duplas.
- **Sincronização em Segundo Plano (`AppState`)**: Se mudares para o Spotify ou bloqueares o ecrã, o temporizador mantém a sincronização exata contra o relógio do sistema (`Date.now()`).
- **Celebração de Recordes Pessoais (PR) em Tempo Real**: Modal comemorativo imediato quando superas a tua marca máxima histórica num exercício.
- **Modo Ecrã Sempre Ligado (`expo-keep-awake`)**: O telemóvel não desliga o ecrã enquanto estás a treinar.

### 2. 🏋️‍♂️ Calculadora de Discos (Plate Calculator)
- **Representação Gráfica da Barra Olímpica**: Visualização da manga da barra com os discos coloridos segundo a norma internacional (25kg Vermelho, 20kg Azul, 15kg Amarelo, 10kg Verde, 5kg Branco, 2.5kg Vermelho escuro, 1.25kg Prata).
- **Seleção de Barra**: Suporte para barra de 20 kg (Olímpica), 15 kg (Feminina / Curta), 10 kg (EZ / Técnica) ou 0 kg (Máquinas / Smith).
- **Discriminação por lado**: Resumo detalhado (ex: `1× 20kg, 1× 10kg, 1× 2.5kg = 32.5kg por lado + 20kg barra = 85kg total`).

### 3. 📋 Rotinas & Templates Personalizáveis (`/index`, `/new-routine`)
- **Modelos Clássicos Integrados**: *Push*, *Pull*, *Legs* e *Full Body*.
- **Editor Avançado de Rotinas**: Criação, edição e reordenação de exercícios com setas (`▲ / ▼`).
- **Sugestão de Carga Progressiva**: Motor inteligente que analisa o último treino e sugere `+2.5 kg` (ou `+2 kg` em halteres) assim que completas o teto de repetições estipulado.

### 4. 📈 Estatísticas, Volume & Consistência (`/stats`)
- **Quadro de Métricas**: Total de treinos, volume total levantado em toneladas, horas acumuladas e estimativa metabólica de calorias baseada na fórmula MET 6.0 indexada ao peso real do InBody.
- **Calendário de Atividade dos Últimos 14 Dias**: Mapa de assiduidade com contador de sequência consecutiva (*streak* diário).
- **Volume Semanal por Grupo Muscular**: Gráfico com a contagem de séries válidas concluídas nos últimos 7 dias (excluindo aquecimentos).
- **Gráficos Interativos de Evolução**: Progressão temporal por exercício filtrando por Carga Máxima, 1RM Estimado (fórmula Brzycki) ou Volume Total.
- **Calculadora de 1RM**: Tabela de percentagens e zonas de treino (Força, Hipertrofia, Resistência).

### 5. 📊 Avaliações InBody & Composição Corporal (`/body`)
- **Métricas Oficiais InBody**: Registo detalhado de Peso, Massa Muscular Esquelética, % Gordura Corporal (PGC), Nível de Gordura Visceral, Taxa Metabólica Basal (TMB) e Pontuação InBody (0–100).
- **Medidas Corporais por Fita Métrica**: Peito, Cintura, Ancas, Braço (Esq/Dir) e Coxa (Esq/Dir).
- **Galeria de Fotos de Evolução**: Comparador lado a lado com modo Antes / Depois (*Slider* interativo).

### 6. 🔁 Histórico & Edição de Treinos (`/history`)
- **Repetir Treino (1 Toque)**: Carrega de imediato uma sessão idêntica com os mesmos exercícios, cargas e repetições.
- **Editor de Sessões Anteriores**: Correção de cargas, repetições, durações, calorias ou notas de treinos passados, com recálculo automático de volume total e séries concluídas.

### 7. 🛡️ Cópia de Segurança & Privacidade Total (Offline-First)
- **100% Local & Privado**: Sem servidores externos, registos de conta ou rastreio.
- **Exportação e Restauro JSON**: Exporta uma cópia de segurança completa com pré-visualização detalhada dos dados e partilha direta para o Google Drive, WhatsApp ou ficheiros locais.

---

## 🛠️ Stack Tecnológica

- **Framework**: [Expo SDK 58](https://expo.dev) com [React Native 0.88](https://reactnative.dev)
- **Navegação**: [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based Routing com Typed Routes)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Persistência**: [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage)
- **Áudio Nativo**: [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/) (sem conflito R8 / ProGuard, áudio em segundo plano com ducking de música)
- **Feedback Háptico**: [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- **Vetor & Gráficos**: [react-native-svg](https://github.com/software-mansion/react-native-svg)

---

## 💻 Desenvolvimento Local

Para clonar e executar o projeto em ambiente de desenvolvimento:

1. **Clonar o repositório**:
   ```bash
   git clone https://github.com/eduams96-jpg/GymTracker.git
   cd GymTracker
   ```

2. **Instalar dependências**:
   ```bash
   npm install
   ```

3. **Iniciar o servidor Expo**:
   ```bash
   npx expo start
   ```

4. **Gerar APK com EAS Build**:
   ```bash
   npx eas-cli build -p android --profile preview
   ```

---

## 📄 Licença

Distribuído sob a licença MIT. Consulta o ficheiro [LICENSE](LICENSE) para mais informações.
