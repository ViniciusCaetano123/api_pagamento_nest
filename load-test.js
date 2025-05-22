import http from 'k6/http';
import { check, sleep } from 'k6';

// Defina seu token JWT aqui
// É uma boa prática carregar isso de uma variável de ambiente ou arquivo de configuração
// mas para o exemplo, vamos deixar direto aqui.
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJEb2N1bWVudG8iOiIyNTYxMTkzMTAxNCIsIkVtYWlsIjoidmluaUBnbWFpbC5jb20iLCJJZCI6ImFiNDIzODY1LTRjNmYtNDkyYS05ZTc3LTI5OTNjMDE4ZDFjNSIsIm5iZiI6MTc0Nzc2Nzc2NiwiZXhwIjoxNzUwMzU5NzY2LCJpYXQiOjE3NDc3Njc3NjYsImlzcyI6IkxlZmlzYyIsImF1ZCI6IkNsaWVudGVzIn0.Hhqi1RVy4aN_H184uYtVS6B5lpMqf6g8CpI9xVo2s-U';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
  },
};

export default function () {
  const BASE_URL = 'https://api.cursoslefisc.com.br/dashboard_v1/'; // Ajuste sua URL base, o dashboard_v1 virá no endpoint

  // Payload da sua requisição POST
  const payload = JSON.stringify({
    carrinho: [
      { curso: 3202, quantidade: 1 },
      { curso: 3203, quantidade: 1 }
    ],
    nomeCupom: ""
  });

  // Parâmetros da requisição, incluindo os headers
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`, // AQUI você adiciona o token Bearer
    },
  };

  // Requisição POST para a rota do carrinho
  const resUsers = http.post(`${BASE_URL}dashboard/pagamento/carrinho`, payload, params);
  console.log(resUsers);  
  check(resUsers, {
    'status is 200': (r) => r.status === 200,
    // Adicione mais checks conforme necessário, por exemplo, para o corpo da resposta   
  });

  sleep(1); // Pausa de 1 segundo entre as iterações de cada usuário virtual
}