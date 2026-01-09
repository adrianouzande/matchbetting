// Variables globales
let modoSeleccionado = 0;
let datosApuesta = {
    modo: 0,
    backStake: 0,
    comision: 0.02,
    bonoNominal: 0,
    tasaConversion: 0,
    valorBonoReal: 0,
    numPartidos: 2,
    cuotasBack: [],
    cuotasLay: [],
    stakesLay: [],
    liabilities: [],
    gananciasLay: [],
    cuotaCombinadaBack: 0,
    gananciaEstimada: 0,
    rating: 0
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Seleccionar modo
    document.querySelectorAll('.modo-card').forEach(card => {
        card.addEventListener('click', function() {
            seleccionarModo(parseInt(this.dataset.modo));
        });
    });

    // Configurar eventos de inputs
    document.getElementById('back-stake').addEventListener('input', actualizarDatos);
    document.getElementById('comision').addEventListener('input', actualizarDatos);
    document.getElementById('bono-nominal').addEventListener('input', actualizarDatos);
    document.getElementById('tasa-conversion').addEventListener('input', actualizarDatos);
    document.getElementById('num-partidos').addEventListener('change', actualizarNumPartidos);

    // Botón calcular
    document.getElementById('calcular-btn').addEventListener('click', calcularApuesta);

    // Botón recálculo
    document.getElementById('recalcular-btn').addEventListener('click', recalcularSegundaApuesta);

    // Botón nueva apuesta
    document.getElementById('nueva-apuesta-btn').addEventListener('click', resetearCalculadora);

    // Generar partidos iniciales
    actualizarNumPartidos();
});

// Funciones principales
function seleccionarModo(modo) {
    modoSeleccionado = modo;
    datosApuesta.modo = modo;

    // Actualizar UI de modos
    document.querySelectorAll('.modo-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`.modo-card[data-modo="${modo}"]`).classList.add('active');

    // Mostrar/ocultar secciones
    document.getElementById('config-section').style.display = 'block';
    
    if (modo === 3) {
        document.getElementById('bono-section').style.display = 'block';
    } else {
        document.getElementById('bono-section').style.display = 'none';
    }

    // Actualizar etiqueta según modo
    const label = document.getElementById('back-stake-label');
    if (modo === 2) {
        label.innerHTML = '<i class="fas fa-coins"></i> Cantidad de APUESTA GRATIS';
    } else {
        label.innerHTML = '<i class="fas fa-coins"></i> Stake TOTAL (dinero real)';
    }

    // Mostrar sección de partidos
    document.getElementById('partidos-section').style.display = 'block';
    document.getElementById('calcular-section').style.display = 'block';
    
    // Ocultar resultados anteriores
    document.getElementById('resultados-section').style.display = 'none';
    document.getElementById('nueva-apuesta-section').style.display = 'none';
}

function actualizarDatos() {
    // Actualizar datos básicos
    datosApuesta.backStake = parseFloat(document.getElementById('back-stake').value) || 0;
    datosApuesta.comision = (parseFloat(document.getElementById('comision').value) || 0) / 100;
    
    // Actualizar datos de bono si modo 3
    if (modoSeleccionado === 3) {
        datosApuesta.bonoNominal = parseFloat(document.getElementById('bono-nominal').value) || 0;
        datosApuesta.tasaConversion = (parseFloat(document.getElementById('tasa-conversion').value) || 0) / 100;
        datosApuesta.valorBonoReal = datosApuesta.bonoNominal * datosApuesta.tasaConversion;
        
        // Mostrar valor del bono
        document.getElementById('valor-bono-real').textContent = datosApuesta.valorBonoReal.toFixed(2);
        document.getElementById('resultado-bono').style.display = 'block';
    }
}

function actualizarNumPartidos() {
    const num = parseInt(document.getElementById('num-partidos').value);
    datosApuesta.numPartidos = num;
    
    // Limpiar arrays
    datosApuesta.cuotasBack = [];
    datosApuesta.cuotasLay = [];
    
    // Generar HTML para partidos
    const container = document.getElementById('partidos-container');
    container.innerHTML = '';
    
    for (let i = 0; i < num; i++) {
        const partidoHTML = `
            <div class="partido-card" data-partido="${i + 1}">
                <div class="partido-header">
                    <i class="fas fa-futbol"></i>
                    <h3>PARTIDO ${i + 1}</h3>
                </div>
                <div class="cuotas-grid">
                    <div class="input-group">
                        <label for="back-${i}">
                            <i class="fas fa-arrow-up"></i> Cuota BACK (apuesta a favor)
                        </label>
                        <input type="number" id="back-${i}" class="cuota-back" step="0.01" min="1.01" placeholder="Ej: 1.50">
                    </div>
                    <div class="input-group">
                        <label for="lay-${i}">
                            <i class="fas fa-arrow-down"></i> Cuota LAY (apuesta en contra)
                        </label>
                        <input type="number" id="lay-${i}" class="cuota-lay" step="0.01" min="1.01" placeholder="Ej: 1.55">
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += partidoHTML;
    }
    
    // Agregar eventos a los nuevos inputs
    document.querySelectorAll('.cuota-back').forEach(input => {
        input.addEventListener('input', actualizarCuotas);
    });
    
    document.querySelectorAll('.cuota-lay').forEach(input => {
        input.addEventListener('input', actualizarCuotas);
    });
}

function actualizarCuotas() {
    for (let i = 0; i < datosApuesta.numPartidos; i++) {
        datosApuesta.cuotasBack[i] = parseFloat(document.getElementById(`back-${i}`).value) || 0;
        datosApuesta.cuotasLay[i] = parseFloat(document.getElementById(`lay-${i}`).value) || 0;
    }
}

function calcularApuesta() {
    // Validaciones
    if (!validarDatos()) return;
    
    // Calcular cuota combinada
    let cuotaCombinada = 1.0;
    for (let cuota of datosApuesta.cuotasBack) {
        cuotaCombinada *= cuota;
    }
    datosApuesta.cuotaCombinadaBack = Math.round(cuotaCombinada * 100) / 100;
    
    // Inicializar arrays
    datosApuesta.stakesLay = new Array(datosApuesta.numPartidos).fill(0);
    datosApuesta.liabilities = new Array(datosApuesta.numPartidos).fill(0);
    datosApuesta.gananciasLay = new Array(datosApuesta.numPartidos).fill(0);
    
    // Cálculos según modo
    if (modoSeleccionado === 1) { // DINERO REAL
        calcularModoReal();
    } else if (modoSeleccionado === 2) { // APUESTA GRATIS
        calcularModoGratis();
    } else if (modoSeleccionado === 3) { // REEMBOLSO
        calcularModoReembolso();
    }
    
    // Calcular ganancia estimada y rating
    calcularGananciaRating();
    
    // Mostrar resultados
    mostrarResultados();
}

function calcularModoReal() {
    for (let i = datosApuesta.numPartidos - 1; i >= 0; i--) {
        let sumaFutura = 0;
        for (let j = i + 1; j < datosApuesta.numPartidos; j++) {
            sumaFutura += datosApuesta.liabilities[j];
        }
        
        datosApuesta.stakesLay[i] = (datosApuesta.backStake * datosApuesta.cuotaCombinadaBack - sumaFutura) / 
                                   (datosApuesta.cuotasLay[i] - datosApuesta.comision);
        datosApuesta.liabilities[i] = datosApuesta.stakesLay[i] * (datosApuesta.cuotasLay[i] - 1);
        datosApuesta.gananciasLay[i] = datosApuesta.stakesLay[i] * (1 - datosApuesta.comision);
    }
}

function calcularModoGratis() {
    const gananciaNetaBack = datosApuesta.backStake * (datosApuesta.cuotaCombinadaBack - 1);
    
    if (datosApuesta.numPartidos === 1) {
        datosApuesta.stakesLay[0] = gananciaNetaBack / 
                                   ((datosApuesta.cuotasLay[0] - 1) + (1 - datosApuesta.comision));
    } else {
        for (let i = datosApuesta.numPartidos - 1; i >= 0; i--) {
            if (i === datosApuesta.numPartidos - 1) {
                datosApuesta.stakesLay[i] = gananciaNetaBack / (datosApuesta.cuotasLay[i] - datosApuesta.comision);
            } else {
                let sumaFutura = 0;
                for (let j = i + 1; j < datosApuesta.numPartidos; j++) {
                    sumaFutura += datosApuesta.liabilities[j];
                }
                datosApuesta.stakesLay[i] = (gananciaNetaBack - sumaFutura) / (datosApuesta.cuotasLay[i] - datosApuesta.comision);
            }
            
            datosApuesta.liabilities[i] = datosApuesta.stakesLay[i] * (datosApuesta.cuotasLay[i] - 1);
            datosApuesta.gananciasLay[i] = datosApuesta.stakesLay[i] * (1 - datosApuesta.comision);
        }
    }
}

function calcularModoReembolso() {
    for (let i = datosApuesta.numPartidos - 1; i >= 0; i--) {
        let sumaFutura = 0;
        for (let j = i + 1; j < datosApuesta.numPartidos; j++) {
            sumaFutura += datosApuesta.liabilities[j];
        }
        
        datosApuesta.stakesLay[i] = (datosApuesta.backStake * datosApuesta.cuotaCombinadaBack - 
                                    sumaFutura - datosApuesta.valorBonoReal) / 
                                   (datosApuesta.cuotasLay[i] - datosApuesta.comision);
        datosApuesta.liabilities[i] = datosApuesta.stakesLay[i] * (datosApuesta.cuotasLay[i] - 1);
        datosApuesta.gananciasLay[i] = datosApuesta.stakesLay[i] * (1 - datosApuesta.comision);
    }
}

function calcularGananciaRating() {
    // Calcular ganancia estimada
    if (modoSeleccionado === 2) {
        datosApuesta.gananciaEstimada = datosApuesta.gananciasLay[0];
    } else if (modoSeleccionado === 3) {
        datosApuesta.gananciaEstimada = datosApuesta.valorBonoReal - datosApuesta.backStake + datosApuesta.gananciasLay[0];
    } else {
        datosApuesta.gananciaEstimada = -datosApuesta.backStake + datosApuesta.gananciasLay[0];
    }
    
    // Calcular rating
    if (modoSeleccionado === 1) {
        const perdidaControlada = Math.abs(datosApuesta.gananciaEstimada);
        if (datosApuesta.backStake > 0) {
            const porcentajePerdida = (perdidaControlada / datosApuesta.backStake) * 100;
            datosApuesta.rating = Math.max(0, 100 - porcentajePerdida);
        }
    } else if (modoSeleccionado === 2) {
        if (datosApuesta.backStake > 0) {
            datosApuesta.rating = (datosApuesta.gananciaEstimada / datosApuesta.backStake) * 100;
        }
    } else if (modoSeleccionado === 3) {
        if (datosApuesta.valorBonoReal > 0) {
            datosApuesta.rating = (datosApuesta.gananciaEstimada / datosApuesta.valorBonoReal) * 100;
        }
    }
}

function mostrarResultados() {
    // Mostrar sección de resultados
    document.getElementById('resultados-section').style.display = 'block';
    document.getElementById('calcular-section').style.display = 'none';
    
    // Construir resumen
    const resumenHTML = `
        <div class="resumen">
            <h3>📈 RESUMEN DE LA OPERACIÓN</h3>
            <div class="resumen-grid">
                <div class="resumen-item">
                    <strong>APUESTA ORIGINAL</strong>
                    <div>Modo: ${modoSeleccionado === 1 ? 'DINERO REAL' : modoSeleccionado === 2 ? 'APUESTA GRATIS' : 'REEMBOLSO'}</div>
                    <div>Stake: ${datosApuesta.backStake.toFixed(2)}€</div>
                    <div>Partidos: ${datosApuesta.numPartidos}</div>
                    <div>Cuota combinada: ${datosApuesta.cuotaCombinadaBack.toFixed(2)}</div>
                </div>
                
                <div class="resumen-item">
                    <strong>COBERTURA EN BETFAIR</strong>
                    <div>Comisión: ${(datosApuesta.comision * 100).toFixed(1)}%</div>
                    <div>Riesgo total: ${datosApuesta.liabilities.reduce((a, b) => a + b, 0).toFixed(2)}€</div>
                    <div>Stake total LAY: ${datosApuesta.stakesLay.reduce((a, b) => a + b, 0).toFixed(2)}€</div>
                </div>
                
                ${modoSeleccionado === 3 ? `
                <div class="resumen-item">
                    <strong>BONO DE REEMBOLSO</strong>
                    <div>Nominal: ${datosApuesta.bonoNominal.toFixed(2)}€</div>
                    <div>Valor real: ${datosApuesta.valorBonoReal.toFixed(2)}€</div>
                </div>
                ` : ''}
                
                <div class="resumen-item">
                    <strong>RESULTADO</strong>
                    <div>Ganancia estimada: ${datosApuesta.gananciaEstimada.toFixed(2)}€</div>
                    <div>Rating: 
                        <span class="rating ${datosApuesta.rating > 70 ? 'high' : datosApuesta.rating > 30 ? 'medium' : 'low'}">
                            ${datosApuesta.rating.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('resumen').innerHTML = resumenHTML;
    
    // Construir tabla de stakes
    let stakesHTML = '';
    for (let i = 0; i < datosApuesta.numPartidos; i++) {
        const condicion = i === 0 ? "INMEDIATAMENTE" : 
                         `Solo si ${i > 1 ? 'GANAN' : 'GANA'} los ${i} anteriores`;
        
        stakesHTML += `
            <tr>
                <td><strong>PARTIDO ${i + 1}</strong><br><small>${condicion}</small></td>
                <td>${datosApuesta.cuotasLay[i].toFixed(2)}</td>
                <td>${datosApuesta.stakesLay[i].toFixed(2)} €</td>
                <td>${datosApuesta.liabilities[i].toFixed(2)} €</td>
                <td>${datosApuesta.gananciasLay[i].toFixed(2)} €</td>
            </tr>
        `;
    }
    
    document.getElementById('stakes-tbody').innerHTML = stakesHTML;
    document.getElementById('stakes-table').style.display = 'block';
    
    // Mostrar sección de recálculo si hay más de 1 partido
    if (datosApuesta.numPartidos > 1) {
        document.getElementById('recalculo-section').style.display = 'block';
    }
    
    // Mostrar botón de nueva apuesta
    document.getElementById('nueva-apuesta-section').style.display = 'block';
    
    // Scroll a resultados
    document.getElementById('resultados-section').scrollIntoView({ behavior: 'smooth' });
}

function recalcularSegundaApuesta() {
    const nuevaLay2 = parseFloat(document.getElementById('nueva-lay-2').value);
    if (!nuevaLay2 || nuevaLay2 < 1.01) {
        mostrarMensaje('error', 'Ingresa una cuota LAY válida para el Partido 2');
        return;
    }
    
    const perdidaPartido1 = datosApuesta.liabilities[0];
    let nuevoStake2, nuevoLiability2, nuevaGananciaLay2;
    
    // Calcular según modo
    if (modoSeleccionado === 1) { // DINERO REAL
        nuevoStake2 = (datosApuesta.backStake * datosApuesta.cuotaCombinadaBack) / (nuevaLay2 - datosApuesta.comision);
    } else if (modoSeleccionado === 2) { // APUESTA GRATIS
        nuevoStake2 = (datosApuesta.backStake * (datosApuesta.cuotaCombinadaBack - 1)) / (nuevaLay2 - datosApuesta.comision);
    } else { // REEMBOLSO
        nuevoStake2 = (datosApuesta.backStake * datosApuesta.cuotaCombinadaBack - datosApuesta.valorBonoReal) / (nuevaLay2 - datosApuesta.comision);
    }
    
    nuevoLiability2 = nuevoStake2 * (nuevaLay2 - 1);
    nuevaGananciaLay2 = nuevoStake2 * (1 - datosApuesta.comision);
    
    // Calcular resultados en ambos escenarios
    let resultadoA, resultadoB;
    
    if (modoSeleccionado === 1) {
        resultadoA = datosApuesta.backStake * datosApuesta.cuotaCombinadaBack - datosApuesta.backStake - perdidaPartido1 - nuevoLiability2;
        resultadoB = nuevaGananciaLay2 - datosApuesta.backStake - perdidaPartido1;
    } else if (modoSeleccionado === 2) {
        resultadoA = datosApuesta.backStake * (datosApuesta.cuotaCombinadaBack - 1) - perdidaPartido1 - nuevoLiability2;
        resultadoB = nuevaGananciaLay2 - perdidaPartido1;
    } else {
        resultadoA = datosApuesta.valorBonoReal - datosApuesta.backStake - perdidaPartido1 + nuevaGananciaLay2;
        resultadoB = datosApuesta.backStake * datosApuesta.cuotaCombinadaBack - datosApuesta.backStake - perdidaPartido1 - nuevoLiability2;
    }
    
    const diferencia = Math.abs(resultadoA - resultadoB);
    const resultadoFinal = (resultadoA + resultadoB) / 2;
    
    // Mostrar resultados del recálculo
    const recalculoHTML = `
        <div class="recalculo-resultado">
            <h4><i class="fas fa-chart-line"></i> Resultado del Recálculo</h4>
            
            <div class="resumen-grid" style="margin-top: 15px;">
                <div class="resumen-item">
                    <strong>SITUACIÓN ACTUAL</strong>
                    <div>Pérdida Partido 1: ${perdidaPartido1.toFixed(2)}€</div>
                    <div>Nueva cuota LAY: ${nuevaLay2.toFixed(2)}</div>
                </div>
                
                <div class="resumen-item">
                    <strong>NUEVO STAKE PARTIDO 2</strong>
                    <div>Stake: ${nuevoStake2.toFixed(2)}€</div>
                    <div>Liability: ${nuevoLiability2.toFixed(2)}€</div>
                    <div>Ganancia si aciertas: ${nuevaGananciaLay2.toFixed(2)}€</div>
                </div>
                
                <div class="resumen-item">
                    <strong>VERIFICACIÓN DEL EQUILIBRIO</strong>
                    <div>Escenario A: ${resultadoA.toFixed(2)}€</div>
                    <div>Escenario B: ${resultadoB.toFixed(2)}€</div>
                    <div>Diferencia: ${diferencia.toFixed(2)}€</div>
                </div>
                
                <div class="resumen-item">
                    <strong>RESULTADO FINAL</strong>
                    <div>Promedio: ${resultadoFinal.toFixed(2)}€</div>
                    <div>${resultadoFinal > 0 ? '🎯 GANANCIA OPTIMIZADA' : resultadoFinal === 0 ? '⚖️ EQUILIBRIO PERFECTO' : '📉 PÉRDIDA CONTROLADA'}</div>
                </div>
            </div>
            
            <table class="comparativa-table" style="margin-top: 20px;">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Inicial</th>
                        <th>Optimizado</th>
                        <th>Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Stake Partido 2</td>
                        <td>${datosApuesta.stakesLay[1].toFixed(2)}€</td>
                        <td>${nuevoStake2.toFixed(2)}€</td>
                        <td>${(nuevoStake2 - datosApuesta.stakesLay[1]).toFixed(2)}€</td>
                    </tr>
                    <tr>
                        <td>Liability Partido 2</td>
                        <td>${datosApuesta.liabilities[1].toFixed(2)}€</td>
                        <td>${nuevoLiability2.toFixed(2)}€</td>
                        <td>${(nuevoLiability2 - datosApuesta.liabilities[1]).toFixed(2)}€</td>
                    </tr>
                </tbody>
            </table>
            
            ${datosApuesta.numPartidos >= 3 ? `
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                <h5><i class="fas fa-info-circle"></i> Fórmula para Partido 3</h5>
                <p>Si pierdes Partido 1 y Partido 2:</p>
                <p><strong>Pérdida_Acumulada = ${perdidaPartido1.toFixed(2)} + ${nuevoLiability2.toFixed(2)} = ${(perdidaPartido1 + nuevoLiability2).toFixed(2)}€</strong></p>
                <p>Para Partido 3: ${modoSeleccionado === 1 ? 'S3 = (B × C) / (L3 - com)' : 
                                   modoSeleccionado === 2 ? 'S3 = B × (C-1) / (L3 - com)' : 
                                   'S3 = (B × C - V) / (L3 - com)'}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('recalculo-resultado').innerHTML = recalculoHTML;
    document.getElementById('recalculo-resultado').style.display = 'block';
    
    // Scroll a resultados del recálculo
    document.getElementById('recalculo-resultado').scrollIntoView({ behavior: 'smooth' });
}

function validarDatos() {
    // Validar stake
    if (!datosApuesta.backStake || datosApuesta.backStake <= 0) {
        mostrarMensaje('error', 'Ingresa un stake válido mayor a 0');
        return false;
    }
    
    // Validar cuotas
    for (let i = 0; i < datosApuesta.numPartidos; i++) {
        if (!datosApuesta.cuotasBack[i] || datosApuesta.cuotasBack[i] < 1.01) {
            mostrarMensaje('error', `Ingresa una cuota BACK válida para el Partido ${i + 1}`);
            return false;
        }
        if (!datosApuesta.cuotasLay[i] || datosApuesta.cuotasLay[i] < 1.01) {
            mostrarMensaje('error', `Ingresa una cuota LAY válida para el Partido ${i + 1}`);
            return false;
        }
        if (datosApuesta.cuotasLay[i] <= datosApuesta.cuotasBack[i]) {
            mostrarMensaje('warning', `La cuota LAY del Partido ${i + 1} debe ser mayor que la cuota BACK`);
            return false;
        }
    }
    
    // Validar bono en modo reembolso
    if (modoSeleccionado === 3) {
        if (!datosApuesta.bonoNominal || datosApuesta.bonoNominal <= 0) {
            mostrarMensaje('error', 'Ingresa un valor nominal del bono válido');
            return false;
        }
        if (!datosApuesta.tasaConversion || datosApuesta.tasaConversion <= 0) {
            mostrarMensaje('error', 'Ingresa una tasa de conversión válida');
            return false;
        }
    }
    
    return true;
}

function mostrarMensaje(tipo, mensaje) {
    // Eliminar mensajes anteriores
    const mensajesAnteriores = document.querySelectorAll('.mensaje');
    mensajesAnteriores.forEach(m => m.remove());
    
    // Crear nuevo mensaje
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje ${tipo}`;
    
    let icono = 'fa-info-circle';
    if (tipo === 'error') icono = 'fa-exclamation-circle';
    if (tipo === 'success') icono = 'fa-check-circle';
    if (tipo === 'warning') icono = 'fa-exclamation-triangle';
    
    mensajeDiv.innerHTML = `
        <i class="fas ${icono}"></i>
        <span>${mensaje}</span>
    `;
    
    // Insertar después del header
    const header = document.querySelector('.header');
    header.parentNode.insertBefore(mensajeDiv, header.nextSibling);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (mensajeDiv.parentNode) {
            mensajeDiv.style.opacity = '0';
            mensajeDiv.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (mensajeDiv.parentNode) mensajeDiv.remove();
            }, 300);
        }
    }, 5000);
}

function resetearCalculadora() {
    // Resetear datos
    datosApuesta = {
        modo: 0,
        backStake: 0,
        comision: 0.02,
        bonoNominal: 0,
        tasaConversion: 0,
        valorBonoReal: 0,
        numPartidos: 2,
        cuotasBack: [],
        cuotasLay: [],
        stakesLay: [],
        liabilities: [],
        gananciasLay: [],
        cuotaCombinadaBack: 0,
        gananciaEstimada: 0,
        rating: 0
    };
    
    // Resetear UI
    document.querySelectorAll('.modo-card').forEach(card => {
        card.classList.remove('active');
    });
    
    document.getElementById('config-section').style.display = 'none';
    document.getElementById('bono-section').style.display = 'none';
    document.getElementById('partidos-section').style.display = 'none';
    document.getElementById('calcular-section').style.display = 'none';
    document.getElementById('resultados-section').style.display = 'none';
    document.getElementById('nueva-apuesta-section').style.display = 'none';
    
    // Resetear inputs
    document.getElementById('back-stake').value = '';
    document.getElementById('comision').value = '2';
    document.getElementById('bono-nominal').value = '';
    document.getElementById('tasa-conversion').value = '';
    document.getElementById('num-partidos').value = '2';
    
    // Regenerar partidos
    actualizarNumPartidos();
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    mostrarMensaje('success', 'Calculadora reiniciada. ¡Lista para una nueva apuesta!');
}