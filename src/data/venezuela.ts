export interface MunicipioVE {
  nombre: string;
  parroquias: string[];
}

export interface EstadoVE {
  nombre: string;
  capital: string;
  municipios: MunicipioVE[];
}

export const ESTADOS_VENEZUELA: EstadoVE[] = [
  {
    nombre: "Distrito Capital",
    capital: "Caracas",
    municipios: [
      {
        nombre: "Libertador",
        parroquias: [
          "Sucre (Catia)", "El Valle", "Coche", "Antímano", "La Vega", 
          "San Juan", "23 de Enero", "Altagracia", "Candelaria", "Catedral", 
          "El Junquito", "El Paraíso", "El Recreo", "La Pastora", "San Agustín", 
          "San Bernardino", "San José", "San Pedro", "Santa Rosalía", "Santa Teresa", "Caricuao", "Macarao"
        ]
      }
    ]
  },
  {
    nombre: "Amazonas",
    capital: "Puerto Ayacucho",
    municipios: [
      { nombre: "Atures", parroquias: ["Fernando Girón Tovar", "Luis Alberto Gómez", "Pahueña", "Platanillal"] },
      { nombre: "Alto Orinoco", parroquias: ["La Esmeralda", "Huachamacare", "Marawaka", "Sierra Parima"] },
      { nombre: "Atabapo", parroquias: ["San Fernando de Atabapo", "Ucata", "Yapacana", "Caname"] },
      { nombre: "Autana", parroquias: ["Isla Ratón", "Samariapo", "Sipapo", "Munduapo", "Guayapo"] },
      { nombre: "Manapiare", parroquias: ["San Juan de Manapiare", "Alto Ventuari", "Bajo Ventuari"] },
      { nombre: "Maroa", parroquias: ["Maroa", "Victorino", "Comunidad"] },
      { nombre: "Río Negro", parroquias: ["San Carlos de Río Negro", "Solano", "Casiquiare", "Cocuy"] }
    ]
  },
  {
    nombre: "Anzoátegui",
    capital: "Barcelona",
    municipios: [
      { nombre: "Simón Bolívar", parroquias: ["El Carmen", "San Cristóbal", "Bergantín", "Caigua", "El Pilar", "Naricual"] },
      { nombre: "Sotillo", parroquias: ["Puerto La Cruz", "Pozuelos"] },
      { nombre: "Anaco", parroquias: ["Anaco", "San Joaquín", "Buena Vista"] },
      { nombre: "Aragua", parroquias: ["Aragua de Barcelona", "Cachipo"] },
      { nombre: "Diego Bautista Urbaneja", parroquias: ["Lechería", "El Morro"] },
      { nombre: "Freites", parroquias: ["Cantaura", "Libertador", "Santa Rosa", "Urica"] },
      { nombre: "Guanta", parroquias: ["Guanta", "Chorrerón"] },
      { nombre: "Independencia", parroquias: ["Soledad", "Mamo"] },
      { nombre: "José Félix Ribas", parroquias: ["Valle de Guanape", "Santa Bárbara"] },
      { nombre: "Juan Manuel Cajigal", parroquias: ["Onoto", "San Pablo"] },
      { nombre: "Libertad", parroquias: ["San Mateo", "El Carito", "Santa Inés"] },
      { nombre: "Manuel Ezequiel Bruzual", parroquias: ["Clarines", "Guanape", "Sabana de Uchire"] },
      { nombre: "Miranda", parroquias: ["Pariaguán", "Atapirire", "Boca del Pao", "El Pao"] },
      { nombre: "Monagas", parroquias: ["Mapire", "Piar", "Santa Clara", "San Diego de Cabrutica"] },
      { nombre: "Peñalver", parroquias: ["Puerto Píritu", "San Miguel", "Sucre"] },
      { nombre: "Píritu", parroquias: ["Píritu", "San Francisco"] },
      { nombre: "San Juan de Capistrano", parroquias: ["Boca de Uchire", "Boca de Chávez"] },
      { nombre: "Santa Ana", parroquias: ["Santa Ana", "Pueblo Nuevo"] },
      { nombre: "Simón Rodríguez", parroquias: ["Edmundo Barrios", "Miguel Otero Silva"] },
      { nombre: "Sir Arthur McGregor", parroquias: ["El Chaparro", "Tomás Alfaro Calatrava"] }
    ]
  },
  {
    nombre: "Apure",
    capital: "San Fernando de Apure",
    municipios: [
      { nombre: "San Fernando", parroquias: ["San Fernando", "El Recreo", "Peñalver", "San Rafael de Atamaica"] },
      { nombre: "Achaguas", parroquias: ["Achaguas", "Apurito", "El Yagual", "Guachara", "Mucuritas", "Queseras del Medio"] },
      { nombre: "Biruaca", parroquias: ["Biruaca"] },
      { nombre: "Muñoz", parroquias: ["Bruzual", "Mantecal", "Quintero", "Rincón Hondo", "San Vicente"] },
      { nombre: "Páez", parroquias: ["Guasdualito", "Aramendi", "El Amparo", "San Camilo", "Urdaneta"] },
      { nombre: "Pedro Camejo", parroquias: ["San Juan de Payara", "Codazzi", "Cunaviche"] },
      { nombre: "Rómulo Gallegos", parroquias: ["Elorza", "La Trinidad"] }
    ]
  },
  {
    nombre: "Aragua",
    capital: "Maracay",
    municipios: [
      { nombre: "Girardot", parroquias: ["Maracay", "Choroní", "Los Tacariguas", "Pedro José Ovalles", "Madre María de San José", "Joaquín Crespo", "José Casanova Godoy", "Andrés Eloy Blanco"] },
      { nombre: "Santiago Mariño", parroquias: ["Turmero", "Chuao", "Alfredo Pacheco Miranda", "Arévalo Aponte", "Samán de Güere"] },
      { nombre: "José Félix Ribas", parroquias: ["La Victoria", "Castor Nieves Ríos", "Zuata", "Guacamaya", "Pao de Zárate"] },
      { nombre: "Sucre", parroquias: ["Cagua", "Bella Vista"] },
      { nombre: "Mario Briceño Iragorry", parroquias: ["El Limón", "Caña de Azúcar"] },
      { nombre: "Bolívar", parroquias: ["San Mateo"] },
      { nombre: "Camatagua", parroquias: ["Camatagua", "Carmen de Cura"] },
      { nombre: "Francisco Linares Alcántara", parroquias: ["Santa Rita", "Francisco de Miranda", "Monsenor Feliciano González"] },
      { nombre: "José Ángel Lamas", parroquias: ["Santa Cruz de Aragua"] },
      { nombre: "José Rafael Revenga", parroquias: ["El Consejo"] },
      { nombre: "Libertador", parroquias: ["Palo Negro", "San Martín de Porres"] },
      { nombre: "Ocumare de la Costa de Oro", parroquias: ["Ocumare de la Costa"] },
      { nombre: "San Casimiro", parroquias: ["San Casimiro", "Güiripa", "Ollas de Caramacate", "Valle Morín"] },
      { nombre: "San Sebastián", parroquias: ["San Sebastián"] },
      { nombre: "Santos Michelena", parroquias: ["Las Tejerías", "Tiara"] },
      { nombre: "Tovar", parroquias: ["Colonia Tovar"] },
      { nombre: "Urdaneta", parroquias: ["Barbacoas", "Las Peñitas", "San Francisco de Cara", "Taguay"] },
      { nombre: "Zamora", parroquias: ["Villa de Cura", "Magdaleno", "San Francisco de Asís", "Valles de Tucutunemo", "Augusto Mijares"] }
    ]
  },
  {
    nombre: "Barinas",
    capital: "Barinas",
    municipios: [
      { nombre: "Barinas", parroquias: ["Barinas", "Alto Barinas", "Corazón de Jesús", "Rómulo Betancourt", "San Silvestre", "Santa Inés", "Torunos", "El Carmen", "Ramón Ignacio Méndez"] },
      { nombre: "Alberto Arvelo Torrealba", parroquias: ["Sabaneta", "Rodríguez Domínguez"] },
      { nombre: "Antonio José de Sucre", parroquias: ["Socopó", "Nicolás Pulido", "Andrés Bello"] },
      { nombre: "Arismendi", parroquias: ["Arismendi", "Guadarrama", "La Unión", "San Antonio"] },
      { nombre: "Bolívar", parroquias: ["Barinitas", "Altamira de Cáceres", "Calderas"] },
      { nombre: "Cruz Paredes", parroquias: ["Barrancas", "El Socorro", "Masparrito"] },
      { nombre: "Ezequiel Zamora", parroquias: ["Santa Bárbara", "Pedro Briceño Méndez", "Ramón Ignacio Méndez", "José Ignacio del Pumar"] },
      { nombre: "Obispos", parroquias: ["Obispos", "El Real", "La Luz", "Los Guasimitos"] },
      { nombre: "Pedraza", parroquias: ["Ciudad Bolivia", "Ignacio Briceño", "José Félix Ribas", "Páez"] },
      { nombre: "Rojas", parroquias: ["Libertad", "Dolores", "Palacio Fajardo", "Santa Rosa"] },
      { nombre: "Sosa", parroquias: ["Ciudad de Nutrias", "El Regalo", "Puerto Nutrias", "Santa Catalina"] }
    ]
  },
  {
    nombre: "Bolívar",
    capital: "Ciudad Bolívar",
    municipios: [
      { nombre: "Angostura del Orinoco", parroquias: ["Catedral", "Agua Salada", "La Sabanita", "Vista Hermosa", "Marhuanta", "José Antonio Páez", "Orinoco", "Panapana", "Zea"] },
      { nombre: "Caroní", parroquias: ["Cachamay", "Chirica", "Dalla Costa", "Unare", "Universidad", "Simón Bolívar", "11 de Abril", "Vista al Sol", "Pozo Verde", "Yocoima"] },
      { nombre: "Angostura", parroquias: ["Ciudad Piar", "San Francisco", "Barceloneta", "Santa Bárbara"] },
      { nombre: "Cedeño", parroquias: ["Caicara del Orinoco", "Altagracia", "Ascensión Farreras", "Guaniamo", "La Urbana", "Pijiguaos"] },
      { nombre: "El Callao", parroquias: ["El Callao"] },
      { nombre: "Gran Sabana", parroquias: ["Santa Elena de Uairén", "Ikabarú"] },
      { nombre: "Heres", parroquias: ["Catedral", "Agua Salada", "La Sabanita"] },
      { nombre: "Piar", parroquias: ["Upata", "Andrés Eloy Blanco", "Pedro Cova"] },
      { nombre: "Roscio", parroquias: ["Guasipati", "Salóm"] },
      { nombre: "Sifontes", parroquias: ["Tumeremo", "Dalla Costa", "San Isidro"] },
      { nombre: "Padre Pedro Chien", parroquias: ["El Palmar"] }
    ]
  },
  {
    nombre: "Carabobo",
    capital: "Valencia",
    municipios: [
      { nombre: "Valencia", parroquias: ["Candelaria", "Catedral", "San Blas", "Miguel Peña", "Rafael Urdaneta", "San José", "Santa Rosa", "Negro Primero", "El Socorro"] },
      { nombre: "Puerto Cabello", parroquias: ["Bartolomé Salom", "Fraternidad", "Goaigoaza", "Patanemo", "Borburata", "Democracia", "Unión", "Páez"] },
      { nombre: "Guacara", parroquias: ["Guacara", "Ciudad Alianza", "Yagua"] },
      { nombre: "Naguanagua", parroquias: ["Naguanagua"] },
      { nombre: "San Diego", parroquias: ["San Diego"] },
      { nombre: "Bejuma", parroquias: ["Bejuma", "Canoabo", "Simón Bolívar"] },
      { nombre: "Carlos Arvelo", parroquias: ["Güigüe", "Belén", "Tacarigua"] },
      { nombre: "Diego Ibarra", parroquias: ["Mariara", "Aguas Calientes"] },
      { nombre: "Juan José Mora", parroquias: ["Morón", "Urama"] },
      { nombre: "Libertador", parroquias: ["Tocuyito", "Independencia"] },
      { nombre: "Los Guayos", parroquias: ["Los Guayos"] },
      { nombre: "Miranda", parroquias: ["Miranda"] },
      { nombre: "Montalbán", parroquias: ["Montalbán"] },
      { nombre: "San Joaquín", parroquias: ["San Joaquín"] }
    ]
  },
  {
    nombre: "Cojedes",
    capital: "San Carlos",
    municipios: [
      { nombre: "Ezequiel Zamora", parroquias: ["San Carlos de Austria", "Juan Ángel Bravo", "Manuel Manrique"] },
      { nombre: "Anzoátegui", parroquias: ["Cojedes", "Juan de Mata Suárez"] },
      { nombre: "Girardot", parroquias: ["El Baúl", "Sucre"] },
      { nombre: "Lima Blanco", parroquias: ["Macapo", "La Aguadita"] },
      { nombre: "Pao de San Juan Bautista", parroquias: ["El Pao"] },
      { nombre: "Ricaurte", parroquias: ["Libertad de Cojedes", "El Amparo"] },
      { nombre: "Rómulo Gallegos", parroquias: ["Las Vegas"] },
      { nombre: "Tinaco", parroquias: ["Tinaco"] },
      { nombre: "Tinaquillo", parroquias: ["Tinaquillo"] }
    ]
  },
  {
    nombre: "Delta Amacuro",
    capital: "Tucupita",
    municipios: [
      { nombre: "Tucupita", parroquias: ["San José", "Virgen del Valle", "San Rafael", "José Vidal Marcano", "Leonardo Ruíz Pineda", "Mariscal Antonio José de Sucre", "Monseñor Argimiro García", "Juan Millán"] },
      { nombre: "Antonio Díaz", parroquias: ["Curiapo", "Almirante Luis Brión", "Francisco Aniceto Lugo", "Manuel Renaud", "Padre Barral", "Santos de Abelgas"] },
      { nombre: "Casacoima", parroquias: ["Sierra Imataca", "Juan Bautista Arismendi", "Manuel Piar", "Rómulo Gallegos"] },
      { nombre: "Pedernales", parroquias: ["Pedernales", "Luis Beltrán Prieto Figueroa"] }
    ]
  },
  {
    nombre: "Falcón",
    capital: "Coro",
    municipios: [
      { nombre: "Miranda", parroquias: ["San Antonio", "Santa Ana", "San Gabriel", "Río Seco", "Sabaneta", "Guzmán Guillermo", "Mitare"] },
      { nombre: "Carirubana", parroquias: ["Punta Cardón", "Carirubana", "Santa Ana", "Norte"] },
      { nombre: "Acosta", parroquias: ["San Juan de los Cayos", "Capadare", "La Pastora", "Libertador"] },
      { nombre: "Bolívar", parroquias: ["San Luis", "Aracua", "La Peña"] },
      { nombre: "Colina", parroquias: ["La Vela de Coro", "Acurigua", "Guaibacoa", "Las Calderas", "Macoruca"] },
      { nombre: "Dabajuro", parroquias: ["Dabajuro"] },
      { nombre: "Democracia", parroquias: ["Pedregal", "Agua Clara", "Avaria", "Piedra Grande", "Purureche"] },
      { nombre: "Falcón", parroquias: ["Pueblo Nuevo", "Adícora", "Baraived", "Buena Vista", "Jadacaquiva", "Moruy", "El Vínculo", "El Hato", "Adaure"] },
      { nombre: "Los Taques", parroquias: ["Los Taques", "Judibana"] },
      { nombre: "Mauroa", parroquias: ["Mene de Mauroa", "San Félix", "Casigua"] },
      { nombre: "Monseñor Iturriza", parroquias: ["Chichiriviche", "Boca de Tocuyo", "Tocuyo de la Costa"] },
      { nombre: "Palmasola", parroquias: ["Palmasola"] },
      { nombre: "Petit", parroquias: ["Cabure", "Colina", "Curimagua"] },
      { nombre: "Silva", parroquias: ["Tucacas", "Boca de Aroa"] },
      { nombre: "Zamora", parroquias: ["Puerto Cumarebo", "La Ciénaga", "La Soledad", "Pueblo Cumarebo", "Zazárida"] }
    ]
  },
  {
    nombre: "Guárico",
    capital: "San Juan de los Morros",
    municipios: [
      { nombre: "Juan Germán Roscio", parroquias: ["San Juan de los Morros", "Cantagallo", "Parapara"] },
      { nombre: "Francisco de Miranda", parroquias: ["Calabozo", "El Calvario", "El Rastro", "Guardatinajas"] },
      { nombre: "Infante", parroquias: ["Valle de la Pascua", "Espino"] },
      { nombre: "Monagas", parroquias: ["Altagracia de Orituco", "San Rafael de Orituco", "San Francisco de Macaira", "Paso Real de Macaira", "Carlos Soublette"] },
      { nombre: "Ribas", parroquias: ["Tucupido", "San Rafael de Laya"] },
      { nombre: "Zaraza", parroquias: ["Zaraza", "San José de Unare"] },
      { nombre: "Camaguán", parroquias: ["Camaguán", "Puerto Miranda", "Uverito"] },
      { nombre: "Chaguaramas", parroquias: ["Chaguaramas"] },
      { nombre: "El Socorro", parroquias: ["El Socorro"] },
      { nombre: "Las Mercedes", parroquias: ["Las Mercedes", "Cabruta", "Santa Rita de Manapire"] },
      { nombre: "Ortiz", parroquias: ["Ortiz", "San Francisco de Tiznados", "San José de Tiznados", "San Lorenzo de Tiznados"] },
      { nombre: "San Gerónimo de Guayabal", parroquias: ["Guayabal", "Cazorla"] },
      { nombre: "San José de Guaribe", parroquias: ["San José de Guaribe"] },
      { nombre: "Santa María de Ipire", parroquias: ["Santa María de Ipire", "Altamira"] }
    ]
  },
  {
    nombre: "La Guaira",
    capital: "La Guaira",
    municipios: [
      {
        nombre: "Vargas",
        parroquias: [
          "La Guaira", "Maiquetía", "Caraballeda", "Catia La Mar", 
          "Macuto", "Naiguatá", "Caruao", "Carlos Soublette", "Urimare", "El Junko"
        ]
      }
    ]
  },
  {
    nombre: "Lara",
    capital: "Barquisimeto",
    municipios: [
      { nombre: "Iribarren", parroquias: ["Catedral", "Concepción", "Santa Rosa", "Unión", "Juan de Villegas (Guerrera Ana Soto)", "Aguedo Felipe Alvarado", "Buena Vista", "Juárez", "El Cují", "Tamaca"] },
      { nombre: "Palavecino", parroquias: ["Cabudare", "José Gregorio Bastidas", "Agua Viva"] },
      { nombre: "Torres", parroquias: ["Trinidad Samuel", "Antonio Díaz", "Camacaro", "Castañeda", "Cecilio Zubillaga", "Chiquinquirá", "El Blanco", "Espinoza de los Monteros", "Lara", "Manuel Morillo", "Montaña Verde", "Montes de Oca", "Reyes Vargas", "Altagracia", "Heriberto Arroyo"] },
      { nombre: "Andrés Eloy Blanco", parroquias: ["Pío Tamayo", "Yacambú", "Quebrada Honda de Guache"] },
      { nombre: "Crespo", parroquias: ["Freitez", "José María Blanco"] },
      { nombre: "Jiménez", parroquias: ["Juan Bautista Rodríguez", "Cuara", "Diego de Lozada", "Paraíso de San José", "San Miguel", "Tintorero", "José Bernardo Dorante"] },
      { nombre: "Morán", parroquias: ["Bolívar", "Anzoátegui", "Guárico", "Hilario Luna y Luna", "Humocaro Alto", "Humocaro Bajo", "La Candelaria", "Morán"] },
      { nombre: "Simón Planas", parroquias: ["Sarare", "Buría", "Gustavo Vegas León"] },
      { nombre: "Urdaneta", parroquias: ["Siquisique", "Moroturo", "San Miguel", "Xaguas"] }
    ]
  },
  {
    nombre: "Mérida",
    capital: "Mérida",
    municipios: [
      { nombre: "Libertador", parroquias: ["El Sagrario", "Milla", "Osuna Rodríguez", "Arias", "Domingo Peña", "Gonzalo Picón Febres", "Jacinto Plaza", "Juan Rodríguez Suárez", "Lasso de la Vega", "Mariano Picón Salas", "Spinetti Dini", "Caracciolo Parra Pérez"] },
      { nombre: "Alberto Adriani", parroquias: ["Presidente Betancourt", "Presidente Páez", "Presidente Rómulo Gallegos", "Gabriel Picón González", "Héctor Amable Mora", "José Nucete Sardi", "Pulido Méndez"] },
      { nombre: "Campo Elías", parroquias: ["Montalbán", "Matriz", "Acequias", "Jají", "La Mesa", "San José del Sur"] },
      { nombre: "Sucre", parroquias: ["Lagunillas", "Chiguará", "Estánquez", "San Juan", "Pueblo Nuevo del Sur"] },
      { nombre: "Tovar", parroquias: ["Tovar", "El Amparo", "San Francisco", "El Llano"] },
      { nombre: "Rangel", parroquias: ["Mucuchíes", "Cacute", "La Toma", "Mucurubá", "San Rafael"] }
    ]
  },
  {
    nombre: "Miranda",
    capital: "Los Teques",
    municipios: [
      { nombre: "Guaicaipuro", parroquias: ["Los Teques", "Cecilio Acosta", "San Pedro", "Altagracia de la Montaña", "El Jarillo", "Paracotos", "Tácata"] },
      { nombre: "Sucre", parroquias: ["Petare", "Leoncio Martínez", "Caucagüita", "Fila de Mariches", "La Dolorita"] },
      { nombre: "Baruta", parroquias: ["Baruta", "El Cafetal", "Las Minas"] },
      { nombre: "Chacao", parroquias: ["Chacao"] },
      { nombre: "El Hatillo", parroquias: ["El Hatillo"] },
      { nombre: "Plaza", parroquias: ["Guarenas"] },
      { nombre: "Zamora", parroquias: ["Guatire", "Bolívar"] },
      { nombre: "Acevedo", parroquias: ["Caucagua", "Aragüita", "Capaya", "El Café", "Marizapa", "Panaquire", "Ribas", "Tapipa"] },
      { nombre: "Andrés Bello", parroquias: ["San José de Barlovento", "Cumbo"] },
      { nombre: "Brión", parroquias: ["Higuerote", "Curiepe", "Tacarigua de Brión"] },
      { nombre: "Buroz", parroquias: ["Mamporal"] },
      { nombre: "Carrizal", parroquias: ["Carrizal"] },
      { nombre: "Cristóbal Rojas", parroquias: ["Charallave", "Las Brisas"] },
      { nombre: "Independencia", parroquias: ["Santa Teresa del Tuy", "El Cartanal"] },
      { nombre: "Los Salias", parroquias: ["San Antonio de los Altos"] },
      { nombre: "Páez", parroquias: ["Río Chico", "El Guapo", "Laguna de Tacarigua", "Paparo", "Tacarigua de la Laguna"] },
      { nombre: "Paz Castillo", parroquias: ["Santa Lucía"] },
      { nombre: "Pedro Gual", parroquias: ["Cúpira", "Machurucuto"] },
      { nombre: "Simón Bolívar", parroquias: ["San Antonio de Yare", "San Francisco de Yare"] },
      { nombre: "Tomás Lander", parroquias: ["Ocumare del Tuy", "La Democracia", "Santa Bárbara"] },
      { nombre: "Urdaneta", parroquias: ["Cúa", "Nueva Cúa"] }
    ]
  },
  {
    nombre: "Monagas",
    capital: "Maturín",
    municipios: [
      { nombre: "Maturín", parroquias: ["Alto de Los Godos", "Boquerón", "Las Cocuizas", "San Simón", "Santa Cruz", "El Corozo", "El Furrial", "Jusepín", "La Pica", "San Vicente"] },
      { nombre: "Acosta", parroquias: ["San Antonio de Capayacuar", "San Francisco"] },
      { nombre: "Aguasay", parroquias: ["Aguasay"] },
      { nombre: "Bolívar", parroquias: ["Caripito"] },
      { nombre: "Caripe", parroquias: ["Caripe", "El Guácharo", "La Guanota", "Sabana de Piedra", "San Agustín", "Teresen"] },
      { nombre: "Cedeño", parroquias: ["Caicara de Maturín", "Areo", "San Félix", "Viento Fresco"] },
      { nombre: "Ezequiel Zamora", parroquias: ["Punta de Mata", "El Tejero"] },
      { nombre: "Libertador", parroquias: ["Temblador", "Chaguaramas", "Las Albinas", "Tabasca"] },
      { nombre: "Piar", parroquias: ["Aragua de Maturín", "Aparicio", "Chaguaramal", "El Pinto", "Guanaguana", "La Toscana", "Taguaya"] },
      { nombre: "Punceres", parroquias: ["Quiriquire", "Cachipo"] },
      { nombre: "Santa Bárbara", parroquias: ["Santa Bárbara"] },
      { nombre: "Sotillo", parroquias: ["Barrancas", "Los Barrancos de Fajardo"] },
      { nombre: "Uracoa", parroquias: ["Uracoa"] }
    ]
  },
  {
    nombre: "Nueva Esparta",
    capital: "La Asunción",
    municipios: [
      { nombre: "Arismendi", parroquias: ["La Asunción"] },
      { nombre: "Mariño", parroquias: ["Porlamar"] },
      { nombre: "Maneiro", parroquias: ["Pampatar", "Aguirre"] },
      { nombre: "Antolín del Campo", parroquias: ["La Plaza de Paraguachí"] },
      { nombre: "Díaz", parroquias: ["San Juan Bautista", "Zabala"] },
      { nombre: "García", parroquias: ["El Valle del Espíritu Santo", "Francisco Fajardo"] },
      { nombre: "Gómez", parroquias: ["Santa Ana", "Bolívar", "Guevara", "Matasiete", "Sucre"] },
      { nombre: "Marcano", parroquias: ["Juan Griego", "Adrián"] },
      { nombre: "Península de Macanao", parroquias: ["Boca de Río", "San Francisco"] },
      { nombre: "Tubores", parroquias: ["Punta de Piedras", "Los Baleales"] },
      { nombre: "Villalba", parroquias: ["San Pedro de Coche", "Vicente Fuentes"] }
    ]
  },
  {
    nombre: "Portuguesa",
    capital: "Guanare",
    municipios: [
      { nombre: "Guanare", parroquias: ["Guanare", "San Juan de Guanaguanare", "Córdoba", "San José de la Montaña", "Virgen de la Coromoto"] },
      { nombre: "Páez", parroquias: ["Acarigua", "Payara", "Pimpinela", "Ramón Peraza"] },
      { nombre: "Araure", parroquias: ["Araure", "Río Acarigua"] },
      { nombre: "Agua Blanca", parroquias: ["Agua Blanca"] },
      { nombre: "Esteller", parroquias: ["Píritu", "Uveral"] },
      { nombre: "Guanarito", parroquias: ["Guanarito", "Trinidad de la Capilla", "Divina Pastora"] },
      { nombre: "Monseñor José Vicente de Unda", parroquias: ["Paraíso de Chabasquén", "Peña Blanca"] },
      { nombre: "Ospino", parroquias: ["Ospino", "Aparición", "La Estación"] },
      { nombre: "Papelón", parroquias: ["Papelón", "Caño Delgadito"] },
      { nombre: "San Genaro de Boconoíto", parroquias: ["Boconoíto", "Antolín Tovar Aquino"] },
      { nombre: "San Rafael de Onoto", parroquias: ["San Rafael de Onoto", "Santa Fe", "Thermo Morles"] },
      { nombre: "Santa Rosalía", parroquias: ["El Playón", "Florida"] },
      { nombre: "Sucre", parroquias: ["Biscucuy", "Concepción", "San José de Saguaz", "San Rafael de Palo Alzado", "Uvencio Antonio Velásquez", "Villa Rosa"] },
      { nombre: "Turén", parroquias: ["Villa Bruzual", "Canelones", "Santa Cruz", "San Isidro Labrador"] }
    ]
  },
  {
    nombre: "Sucre",
    capital: "Cumaná",
    municipios: [
      { nombre: "Sucre", parroquias: ["Altagracia", "Santa Inés", "Valentín Valiente", "Ayacucho", "San Juan", "Gran Mariscal", "Raúl Leoni"] },
      { nombre: "Bermúdez", parroquias: ["Carúpano", "Santa Catalina", "Santa Rosa", "Bolívar", "Macarapana"] },
      { nombre: "Andrés Eloy Blanco", parroquias: ["Casanay", "Mariño"] },
      { nombre: "Andrés Mata", parroquias: ["San José de Aerocuar", "Tavera Acosta"] },
      { nombre: "Arismendi", parroquias: ["Río Caribe", "Antonio José de Sucre", "El Morro de Puerto Santo", "Puerto Santo", "San Juan de las Galdonas"] },
      { nombre: "Benítez", parroquias: ["El Pilar", "El Rincón", "General Francisco Antonio Vásquez", "Guaraúnos", "Tunapuicito", "Unión"] },
      { nombre: "Bolívar", parroquias: ["Marigüitar"] },
      { nombre: "Cajigal", parroquias: ["Yaguaraparo", "El Paujil", "Libertad"] },
      { nombre: "Cruz Salmerón Acosta", parroquias: ["Araya", "Chacopata", "Manicuare"] },
      { nombre: "Libertador", parroquias: ["Tunapuy", "Campo Elías"] },
      { nombre: "Mariño", parroquias: ["Irapa", "Campo Claro", "Marabal", "San Antonio de Irapa", "Soro"] },
      { nombre: "Mejía", parroquias: ["San Antonio del Golfo"] },
      { nombre: "Montes", parroquias: ["Cumanacoa", "Arenas", "Aricagua", "Cocollar", "San Fernando", "San Lorenzo"] },
      { nombre: "Ribero", parroquias: ["Cariaco", "Catuaro", "Rendón", "Santa Cruz", "Santa María"] },
      { nombre: "Valdez", parroquias: ["Güiria", "Bideau", "Cristóbal Colón", "Punta de Piedras"] }
    ]
  },
  {
    nombre: "Táchira",
    capital: "San Cristóbal",
    municipios: [
      { nombre: "San Cristóbal", parroquias: ["La Concordia", "San Juan Bautista", "Pedro María Morantes", "San Sebastián", "Dr. Francisco Romero Lobo"] },
      { nombre: "Cárdenas", parroquias: ["Táriba", "Amenodoro Rangel Bárcenas", "La Florida"] },
      { nombre: "Andrés Bello", parroquias: ["Cordero"] },
      { nombre: "Antonio Rómulo Costa", parroquias: ["Las Mesas"] },
      { nombre: "Ayacucho", parroquias: ["San Juan de Colón", "San Pedro del Río", "Rivas Berti"] },
      { nombre: "Bolívar", parroquias: ["San Antonio del Táchira", "Palotal", "Juan Vicente Gómez", "Isaías Medina Angarita"] },
      { nombre: "Fernández Feo", parroquias: ["San Rafael del Piñal", "Santo Domingo", "Alberto Adriani"] },
      { nombre: "García de Hevia", parroquias: ["La Fría", "Boca de Grita", "José Antonio Páez"] },
      { nombre: "Jáuregui", parroquias: ["La Grita", "Emilio Constantino Guerrero", "Monseñor Miguel Antonio Salas"] },
      { nombre: "Junín", parroquias: ["Rubio", "Bramón", "La Petrólea", "Quinimarí"] },
      { nombre: "Libertad", parroquias: ["Capacho Viejo", "Cipriano Castro", "Manuel Felipe Rugeles"] },
      { nombre: "Independencia", parroquias: ["Capacho Nuevo", "Juan Germán Roscio", "Román Cárdenas"] },
      { nombre: "Pedro María Ureña", parroquias: ["Ureña", "Nueva Arcadia"] },
      { nombre: "Torbes", parroquias: ["San Josecito"] }
    ]
  },
  {
    nombre: "Trujillo",
    capital: "Trujillo",
    municipios: [
      { nombre: "Trujillo", parroquias: ["Matriz", "Chiquinquirá", "Monseñor Carrillo", "Cruz Carrillo", "Andrés Linares", "Cristóbal Mendoza", "Tres Esquinas"] },
      { nombre: "Valera", parroquias: ["Mercedes Díaz", "Juan Ignacio Montilla", "La Beatriz", "Mendoza del Valle de Momboy", "La Puerta", "San Luis"] },
      { nombre: "Boconó", parroquias: ["Boconó", "El Carmen", "Mosquey", "San José", "Vega de Guarnizo", "San Miguel", "Burbusay", "General Ribas", "Guache", "Monseñor Jáuregui", "Rafael Rangel", "San Rafael"] },
      { nombre: "Carache", parroquias: ["Carache", "La Concepción", "Cuicas", "Panamericana", "Santa Cruz"] },
      { nombre: "Candelaria", parroquias: ["Chejendé", "Arnoldo Gabaldón", "Bolivia", "Carrillo", "Cegarra", "Manuel Salvador Ulloa", "San José"] },
      { nombre: "Escuque", parroquias: ["Escuque", "La Unión", "Santa Rita", "Sabana Libre"] },
      { nombre: "Pampán", parroquias: ["Pampán", "Flor de Patria", "La Paz", "Santa Ana"] },
      { nombre: "Pampanito", parroquias: ["Pampanito", "Pampanito II", "La Concepción"] },
      { nombre: "Rafael Rangel", parroquias: ["Betijoque", "José Gregorio Hernández", "La Pueblita", "Los Cedros"] },
      { nombre: "Sucre", parroquias: ["Sabana de Mendoza", "Junín", "Valmore Rodríguez", "El Paraíso"] }
    ]
  },
  {
    nombre: "Yaracuy",
    capital: "San Felipe",
    municipios: [
      { nombre: "San Felipe", parroquias: ["San Felipe", "Albarico", "San Javier"] },
      { nombre: "Independencia", parroquias: ["Independencia"] },
      { nombre: "Aristides Bastidas", parroquias: ["San Pablo"] },
      { nombre: "Bolívar", parroquias: ["Aroa"] },
      { nombre: "Bruzual", parroquias: ["Chivacoa", "Campo Elías"] },
      { nombre: "Cocorote", parroquias: ["Cocorote"] },
      { nombre: "Manuel Monge", parroquias: ["Yumare"] },
      { nombre: "Nirgua", parroquias: ["Nirgua", "Salóm", "Temerla"] },
      { nombre: "Peña", parroquias: ["Yaritagua", "San Andrés"] },
      { nombre: "Sucre", parroquias: ["Guama"] },
      { nombre: "Urachiche", parroquias: ["Urachiche"] },
      { nombre: "Veroes", parroquias: ["Farriar", "El Guayabo"] }
    ]
  },
  {
    nombre: "Zulia",
    capital: "Maracaibo",
    municipios: [
      { nombre: "Maracaibo", parroquias: ["Chiquinquirá", "Coquivacoa", "Olegario Villalobos", "Santa Lucía", "Venancio Pulgar", "Idelfonso Vásquez", "Bolívar", "Caracciolo Borjas", "Cecilio Acosta", "Cristo de Aranza", "Francisco Eugenio Bustamante", "Juana de Ávila", "Manuel Dagnino", "Raúl Leoni", "San Isidro"] },
      { nombre: "San Francisco", parroquias: ["San Francisco", "Domitila Flores", "Los Cortijos", "El Bajo", "Francisco Ochoa", "José Domingo Rus", "Marcial Hernández"] },
      { nombre: "Cabimas", parroquias: ["Carmen Herrera", "Ambrosio", "Germán Ríos Linares", "La Rosa", "Jorge Hernández", "Rómulo Betancourt", "San Benito", "Arístides Calvani", "Punta Gorda"] },
      { nombre: "Lagunillas", parroquias: ["Ciudad Ojeda", "Alonso de Ojeda", "Venezuela", "Eleazar López Contreras", "Campo Lara"] },
      { nombre: "Mara", parroquias: ["San Rafael", "Tamare", "Ricaurte", "La Sierrita", "Las Parcelas", "Luis de Vicente", "Monseñor Marcos Sergio Godoy"] },
      { nombre: "Colón", parroquias: ["San Carlos del Zulia", "Santa Bárbara", "Moralito", "Santa Cruz del Zulia", "Urribarrí"] },
      { nombre: "Baralt", parroquias: ["San Timoteo", "General Bernardino Caballero", "Libertador", "Marcelino Briceño", "Pueblo Nuevo", "Manuel Guanipa Matos"] },
      { nombre: "Guajira", parroquias: ["Sinamaica", "Alta Guajira", "Elías Sánchez Rubio", "Guajira"] },
      { nombre: "Machiques de Perijá", parroquias: ["Machiques", "Bartolomé de las Casas", "Libertad", "Río Negro"] },
      { nombre: "Rosario de Perijá", parroquias: ["El Rosario", "Donaldo García", "Sixto Zambrano"] },
      { nombre: "Valmore Rodríguez", parroquias: ["Bachaquero", "Beatriz Alfaro", "La Victoria"] }
    ]
  },
  {
    nombre: "Dependencias Federales",
    capital: "Gran Roque",
    municipios: [
      { nombre: "Archipiélago Los Roques", parroquias: ["Gran Roque"] },
      { nombre: "Archipiélago Las Aves", parroquias: ["Las Aves"] },
      { nombre: "Isla La Orchila", parroquias: ["La Orchila"] },
      { nombre: "Isla La Blanquilla", parroquias: ["La Blanquilla"] },
      { nombre: "Isla La Tortuga", parroquias: ["La Tortuga"] },
      { nombre: "Archipiélago Los Hermanos", parroquias: ["Los Hermanos"] },
      { nombre: "Archipiélago Los Testigos", parroquias: ["Los Testigos"] },
      { nombre: "Isla de Aves", parroquias: ["Isla de Aves"] },
      { nombre: "Isla de Patos", parroquias: ["Isla de Patos"] },
      { nombre: "Archipiélago Los Monjes", parroquias: ["Los Monjes"] }
    ]
  }
];

/**
 * Normaliza cadenas para comparación insensible a mayúsculas, acentos y espacios
 */
export function normalizarTextoGeografico(txt: string): string {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Funciones de utilidad garantizadas para la división político-territorial de Venezuela
 */
export function obtenerEstado(nombreEstado: string): EstadoVE | undefined {
  if (!nombreEstado || !nombreEstado.trim()) return undefined;
  const buscado = normalizarTextoGeografico(nombreEstado);

  // Aliases frecuentes en Venezuela
  if (buscado === 'caracas' || buscado.includes('distrito')) {
    return ESTADOS_VENEZUELA.find(e => e.nombre === 'Distrito Capital');
  }
  if (buscado === 'vargas') {
    return ESTADOS_VENEZUELA.find(e => e.nombre === 'La Guaira');
  }

  return ESTADOS_VENEZUELA.find(e => normalizarTextoGeografico(e.nombre) === buscado);
}

export function obtenerMunicipiosDeEstado(nombreEstado: string): MunicipioVE[] {
  const est = obtenerEstado(nombreEstado);
  return est ? est.municipios : [];
}

export function obtenerParroquiasDeMunicipio(nombreEstado: string, nombreMunicipio: string): string[] {
  if (!nombreEstado || !nombreMunicipio || !nombreMunicipio.trim()) return [];
  const muns = obtenerMunicipiosDeEstado(nombreEstado);
  const buscado = normalizarTextoGeografico(nombreMunicipio);
  const target = muns.find(m => normalizarTextoGeografico(m.nombre) === buscado);
  return target ? target.parroquias : [];
}

