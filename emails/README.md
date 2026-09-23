# Convites da Biblioteca

Os três modelos usam as ilustrações originais “Lápis · detalhado” do HTML aprovado.
A prévia em `/emails/previa.html` usa dados de exemplo e não envia mensagens.

`biblioteca-email.js` funciona no navegador e em Node (CommonJS). O backend existente
pode obter `{subject, html, text}` com:

```js
const {message} = require('./biblioteca-email.js');
const content = message({
  type: 'new', // 'welcome' ou 'fortnight'
  works: [{id: snapshot.id, ...snapshot.data()}],
  unsubscribeUrl: existingUnsubscribeUrl
});
// Passar content ao transportador de e-mail existente.
```

Para `fortnight`, fornecer todos os registros publicados de `conteudos` (com seus IDs),
ou uma consulta abrangendo os 15 dias anteriores. O modelo valida a janela
`agora - 15 dias < publicação <= agora`, ordena por publicação decrescente e rejeita
rascunhos e datas ausentes/futuras. Aceita `publishedAt`, `createdAt` ou `timestamp`,
incluindo Timestamp do Firestore. Não usa `updatedAt` nem o ano da obra como publicação.
O texto curto é composto com os títulos reais selecionados. Uma quinzena vazia
recebe texto explícito, sem inventar novidades.

Os campos `titulo`, `autor`, `ano`, `codigo` e seus equivalentes de frontend são aceitos.
Links priorizam o ID estável do Firestore; código e título são alternativas para obras
estáticas. Os links passam pelo site e pelo leitor existente, mantendo a proteção normal.
URLs arbitrárias de mídia não são aceitas como destinos de links enviados.

## Integração pendente

Este repositório contém as inscrições Firestore `avisos` (`ativo`, `novaPeca`, `quinzenal`),
mas não contém o serviço de disparo, agendamento ou credenciais do provedor de e-mail.
O módulo não cria um segundo disparador e não altera a lista de destinatários.
É necessário importar `message` no serviço existente e preservar transporte,
remetente, cancelamento e preferências de destinatários antes do envio de validação.
Nenhum e-mail foi enviado por este código.

Validação: `node --test emails/biblioteca-email.test.cjs`.
