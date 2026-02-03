const path = require('path');

// Mock Browser Globals
global.window = {};
global.document = {
  getElementById: jest.fn().mockImplementation((id) => {
    // Mock basic inputs
    const inputs = {
      'importarDia': { value: '15' },
      'observacoesTexto': { innerHTML: '' },
      'assinaturaTexto': { textContent: '' },
      'assinaturaInfoTexto': { textContent: '' },
      'footerLemaTexto': { textContent: '' },
      'footerEnderecoTexto1': { textContent: '' },
      'footerEnderecoTexto2': { textContent: '' },
      'equipesContainer': { innerHTML: '' }
    };
    if(inputs[id]) return inputs[id];
    return { value: '', classList: { remove: jest.fn(), add: jest.fn() }, addEventListener: jest.fn() };
  }),
  querySelectorAll: jest.fn().mockReturnValue([]),
  createElement: jest.fn().mockReturnValue({ dataset: {} })
};
global.localStorage = { getItem: jest.fn() };
global.alert = jest.fn();
global.confirm = jest.fn().mockReturnValue(true);

// Mock API calls
global.buscarMeuPerfil = jest.fn().mockRejectedValue({ message: 'Mocked Env' }); // Prevent auto-run crash

// Import Scripts (require executes them)
const Mensal = require('../../frontend/js/mensal.js');
const Diaria = require('../../frontend/js/diaria.js');

describe('Escala Mensal Logic', () => {
  test('migrarEquipes converts object to array', () => {
    const oldEquipes = { 'A': [1], 'B': [2] };
    const config = { offsetA: 1, offsetB: 0 };
    
    // Inject config into Mensal DB (needs careful handling since DB is module-internal)
    Mensal.DB.config = config;
    
    // Actually migrarEquipes logic inside mensal.js uses DB.config?
    // Looking at the code:
    /*
      equipes = Object.keys(mensal.equipes).map(k => ({
        id: k,
        offset: mensal.config[`offset${k}`] ?? 0, ...
      }));
    */
    // Wait, migrarEquipes takes `dados.equipes` AND likely needs `dados.config`?
    // checking `mensal.js`:
    /*
     function migrarEquipes(eqs) { ... return Object.keys(eqs).map(k => ({ ..., offset: DB.config['offset'+k] })) }
    */
    // So we need DB.config populated FIRST.
    
    // But Mensal.DB is what we exported.
    Mensal.DB.config = { offsetA: 1, offsetB: 0 };
    
    const newEquipes = Mensal.migrarEquipes(oldEquipes);
    expect(newEquipes).toHaveLength(2);
    expect(newEquipes[0]).toMatchObject({ id: 'A', offset: 1 });
  });

  test('getTurno calculates D/N correctly', () => {
    const equipe = { id: 'A', offset: 1 }; // offset 1 means starts with N on day 0? 
    // dayIndex + offset % 5. 
    // If offset=1, dayIndex=0 -> pos=1 (N). Correct.
    expect(Mensal.getTurno(equipe, 0)).toBe('N');
    expect(Mensal.getTurno(equipe, 1)).toBe('Folga'); // 2 is folga?
    // Logic: pos 0=D, 1=N, others empty
    expect(Mensal.getTurno(equipe, 2)).toBe('');
  });
});

describe('Escala Diaria Logic', () => {
  beforeEach(() => {
    Diaria.DB.efetivo = []; // Reset
  });

  test('processarImportacaoMensal adds correct D/N personnel', () => {
    // Mock Mensal Data
    const mensalData = {
      config: { 
        mesInicio: 0, anoEscala: 2026, diaInicio: 1, diaFim: 31,
        horarios: { D: '07-19', N: '19-07' },
        offsetA: 0, // A starts D on day 1 (index 0) => (0+0)%5=0=D
        offsetB: 1  // B starts N on day 1 => (0+1)%5=1=N
      },
      equipes: {
        'A': [101], // Militar 101 in Col 0
        'B': [102]  // Militar 102 in Col 0
      },
      militares: [
        { id: 101, nome: 'Soldado One', posto: 'Sd', rg: '111' },
        { id: 102, nome: 'Soldado Two', posto: 'Cb', rg: '222' }
      ],
      colunas: ['Setor X']
    };

    // Run Import for Day 1
    Diaria.processarImportacaoMensal(mensalData, 1);

    expect(Diaria.DB.efetivo).toHaveLength(2);
    
    const efetivoA = Diaria.DB.efetivo.find(e => e.militares.includes('One'));
    const efetivoB = Diaria.DB.efetivo.find(e => e.militares.includes('Two'));

    expect(efetivoA.horario).toBe('07-19');
    expect(efetivoA.setor).toBe('Setor X');
    expect(efetivoB.horario).toBe('19-07');
  });

  test('ordenarEfetivo sorts D before N', () => {
    Diaria.DB.efetivo = [
        { horario: '18:00', setor: 'A', tipo: 'EFETIVO' },
        { horario: '06:00', setor: 'B', tipo: 'EFETIVO' }
    ];
    Diaria.ordenarEfetivo();
    expect(Diaria.DB.efetivo[0].horario).toBe('06:00');
    expect(Diaria.DB.efetivo[1].horario).toBe('18:00');
  });
});
