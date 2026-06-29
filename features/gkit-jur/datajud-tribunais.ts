export type DataJudTribunal = {
  sigla: string;
  nome: string;
  alias: string;
};

export const DATAJUD_TRIBUNAIS: DataJudTribunal[] = [
  { sigla: 'TJSP', nome: 'Tribunal de Justica de Sao Paulo', alias: 'api_publica_tjsp' },
  { sigla: 'TJRJ', nome: 'Tribunal de Justica do Rio de Janeiro', alias: 'api_publica_tjrj' },
  { sigla: 'TJMG', nome: 'Tribunal de Justica de Minas Gerais', alias: 'api_publica_tjmg' },
  { sigla: 'TJPR', nome: 'Tribunal de Justica do Parana', alias: 'api_publica_tjpr' },
  { sigla: 'TJRS', nome: 'Tribunal de Justica do Rio Grande do Sul', alias: 'api_publica_tjrs' },
  { sigla: 'TRF3', nome: 'Tribunal Regional Federal da 3a Regiao', alias: 'api_publica_trf3' },
  { sigla: 'TRT2', nome: 'Tribunal Regional do Trabalho da 2a Regiao', alias: 'api_publica_trt2' },
  { sigla: 'STJ', nome: 'Superior Tribunal de Justica', alias: 'api_publica_stj' },
];
