// masks.js

// Máscara de CPF (###.###.###-##)
function maskCPF(value) {
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos de novo (para o segundo bloco)
    .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca um hífen entre o terceiro e o quarto dígitos
    .substring(0, 14); // Limita o tamanho
}

// Máscara de Moeda (R$ #.###,##)
function maskCurrency(value) {
  value = value.replace(/\D/g, ''); // Remove tudo que não for dígito
  value = (parseInt(value, 10) / 100).toFixed(2); // Divide por 100 e fixa 2 casas decimais

  if (isNaN(value)) {
    return "";
  }
  
  return 'R$ ' + value.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
}

function maskProcesso(value) {
  // Remove tudo que não for dígito
  let v = value.replace(/\D/g, '');
  
  // Limita a 20 dígitos, que é o total para este formato
  v = v.substring(0, 20);

  // Aplica a formatação passo a passo à medida que o usuário digita
  if (v.length > 7) {
    v = v.substring(0, 7) + '-' + v.substring(7);
  }
  if (v.length > 10) { // 7 dígitos + hífen + 2 dígitos
    v = v.substring(0, 10) + '.' + v.substring(10);
  }
  if (v.length > 15) { // 10 chars + ponto + 4 dígitos
    v = v.substring(0, 15) + '.' + v.substring(15);
  }
  if (v.length > 17) { // 15 chars + ponto + 1 dígito
    v = v.substring(0, 17) + '.' + v.substring(17);
  }
  if (v.length > 20) { // 17 chars + ponto + 2 dígitos
    v = v.substring(0, 20) + '.' + v.substring(20);
  }

  return v;
}