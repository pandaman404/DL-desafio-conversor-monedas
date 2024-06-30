const currencies = {};
const historicalPrices = {};
const apiUrlBase = 'https://mindicador.cl/api';
const currentDate = new Date();
let currencyChart = null;
let previousCurrency = null;

const currencyConverterForm = document.getElementById('currencyConverterForm');
const result = document.getElementById('result');

currencyConverterForm.addEventListener('submit', handleSubmit);
document.addEventListener('DOMContentLoaded', () => {
  getCurrencies();
});

function handleSubmit(event) {
  event.preventDefault();
  let formData = Object.fromEntries(new FormData(event.target));
  if (formData && formData.pesos && formData.currency) {
    convertCurrency(formData.pesos, formData.currency);
    getCurrenciesLast10Days(formData.currency);
  }
}

async function getCurrencies() {
  try {
    const response = await fetch(apiUrlBase);
    if (response.ok) {
      const { dolar, euro, bitcoin } = await response.json();
      currencies.dolar = dolar;
      currencies.euro = euro;
      currencies.bitcoin = bitcoin;
    }
  } catch (error) {
    renderResult('error');
  }
}

async function getCurrenciesLast10Days(currency) {
  try {
    if (!historicalPrices[currency]) {
      const currentYear = currentDate.getFullYear();
      const response = await fetch(`${apiUrlBase}/${currency}/${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        mapChartData(currency, data);
      }
    }
    renderChart(currency, historicalPrices);
  } catch (error) {
    renderResult('error');
  }
}

function convertCurrency(valueInPesos, currency) {
  if (Object.getOwnPropertyNames(currencies).length === 0) {
    renderResult('error');
    return;
  }
  switch (currency) {
    case 'dolar':
      const valueInDolars = (valueInPesos / currencies.dolar.valor).toFixed(2);
      renderResult(valueInDolars);
      return;
    case 'euro':
      const valueInEuros = (valueInPesos / currencies.euro.valor).toFixed(2);
      renderResult(valueInEuros);
      return;
    case 'bitcoin':
      const valueInBitcoin = (valueInPesos / currencies.dolar.valor / currencies.bitcoin.valor).toFixed(2);
      renderResult(valueInBitcoin);
      return;
    default:
      break;
  }
}

function renderResult(value) {
  if (value === 'error') {
    result.innerHTML = `Ups! ha ocurrido un error inesperado.`;
    return;
  }

  result.innerHTML = `Resultado: $${value}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

function mapChartData(currency, data) {
  const currentDateMinus10Days = new Date(currentDate).setDate(currentDate.getDate() - 10);
  if (data.hasOwnProperty('serie')) {
    for (const item of data.serie.reverse()) {
      if (new Date(item.fecha) >= currentDateMinus10Days && new Date(item.fecha) <= currentDate) {
        if (!historicalPrices[currency]) {
          historicalPrices[currency] = {
            dates: [],
            values: [],
          };
        }
        historicalPrices[currency]['dates'].push(formatDate(new Date(item.fecha)));
        historicalPrices[currency]['values'].push(item.valor);
      }
    }
  }
}

function renderChart(currency, historicalPrices) {
  if (previousCurrency != currency) {
    previousCurrency = currency;
    document.getElementById('currencyChart').style.background = 'white';
    const ctx = document.getElementById('currencyChart').getContext('2d');

    if (currencyChart) {
      currencyChart.destroy();
    }

    currencyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: historicalPrices[currency]['dates'],
        datasets: [
          {
            label: `Historial ${currency} últimos 10 días (valor en ${currency === 'bitcoin' ? 'dolares' : 'pesos'})`,
            data: historicalPrices[currency]['values'],
            borderWidth: 1,
          },
        ],
      },
    });
  }
}
