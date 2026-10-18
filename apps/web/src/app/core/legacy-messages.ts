/**
 * Mensagens do legado (FluxoTelas / telas Swing), preservadas literalmente.
 * Fonte: JAVA/CeViu/src/GUI/FluxoTelas.java e docs/HANDOFF.md §7.1.
 */
export const LEGACY_MESSAGES = {
  loginOk: 'Informações válidas!',
  loginInvalido: 'Email ou senha inválidos!',
  cadastroOk: 'Usuário cadastrado com sucesso!',
  cadastroInvalido: 'Campos inválidos!',
  assistidoOk: 'Adicinado ao seu perfil!',
  favoritoOk: 'Adicinado aos seu favoritos!',
  falhaAssistido: 'Falha ao marcar como assistido!',
  falhaFavorito: 'Falha ao marcar como favorito!',
  filmeRemovido: 'Filme removida do banco de Dados!',
  serieRemovida: 'Serie removida do banco de Dados!',
  sinopseAlterada: 'Alterada com sucesso',
  listaVazia: 'Nenhum item favorito encontrado.',
  resultadoVazio: 'Nenhum resultado encontrado para os critérios de pesquisa.',
} as const;

export type LegacyMessageKey = keyof typeof LEGACY_MESSAGES;
