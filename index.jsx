import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';

// Variáveis globais para Firebase, fornecidas pelo ambiente.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Inicializa a conexão com o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Componente principal do aplicativo
const App = () => {
    // --- Gerenciamento de estado da aplicação ---
    const [view, setView] = useState('dashboard'); // Controla a visão: 'dashboard', 'patients', 'patient-details', 'add-patient'
    const [patients, setPatients] = useState([]); // Lista de pacientes
    const [selectedPatient, setSelectedPatient] = useState(null); // Paciente selecionado para visualização
    const [isAuthReady, setIsAuthReady] = useState(false); // Flag para estado de autenticação
    const [userId, setUserId] = useState(null); // ID do usuário autenticado
    const [anamnesisForm, setAnamnesisForm] = useState({
        fisico: '',
        mental: '',
        emocional: '',
        ambiental: '',
        espiritual: '',
        intensidade: 5,
        queixas: '',
        hipoteses: { essencial: '', especifico: '', adicional: '' },
        planoAcao: '',
    });
    const [message, setMessage] = useState(''); // Mensagens para o usuário
    const [searchTerm, setSearchTerm] = useState(''); // Termo de busca
    const [isMessageVisible, setIsMessageVisible] = useState(false); // Controla a visibilidade da mensagem

    // --- Efeitos de inicialização e dados ---
    useEffect(() => {
        // Autentica o usuário no Firebase
        const authenticate = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
                setUserId(auth.currentUser.uid);
            } catch (error) {
                console.error("Erro de autenticação:", error);
            } finally {
                setIsAuthReady(true);
            }
        };
        authenticate();
    }, []);

    useEffect(() => {
        // Escuta por mudanças na coleção de pacientes
        if (isAuthReady && userId) {
            const patientCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/patients`);
            const unsubscribe = onSnapshot(patientCollectionRef, async (snapshot) => {
                const fetchedPatients = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Para cada paciente, busca as sessões relacionadas
                const patientsWithSessions = await Promise.all(fetchedPatients.map(async (patient) => {
                    const sessionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/patients/${patient.id}/sessions`);
                    const sessionsSnapshot = await getDocs(sessionsCollectionRef);
                    const sessions = sessionsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    // Ordena as sessões por data em ordem decrescente
                    sessions.sort((a, b) => b.data.seconds - a.data.seconds);
                    return { ...patient, sessions };
                }));
                setPatients(patientsWithSessions);
            }, (error) => {
                console.error("Erro ao carregar pacientes:", error);
            });

            return () => unsubscribe();
        }
    }, [isAuthReady, userId]);

    // --- Funções de manipulação de dados ---
    const showMessage = (text) => {
        setMessage(text);
        setIsMessageVisible(true);
        setTimeout(() => setIsMessageVisible(false), 3000);
    };

    const handlePatientSubmit = async (e) => {
        e.preventDefault();
        const { nome, email, telefone, historico, alergias, medicamentos, fisico, mental, emocional, ambiental, espiritual, intensidade, queixas, essencial, especifico, adicional, planoAcao } = e.target.elements;

        // Cria o novo documento do paciente
        const newPatient = {
            nome: nome.value,
            email: email.value,
            telefone: telefone.value,
            historico: historico.value,
            alergias: alergias.value,
            medicamentos: medicamentos.value,
            createdAt: new Date(),
        };

        try {
            // Adiciona o paciente à coleção principal
            const patientDocRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/patients`), newPatient);

            // Cria a primeira sessão para o paciente com os dados da anamnese
            const newSession = {
                fisico: fisico.value,
                mental: mental.value,
                emocional: emocional.value,
                ambiental: ambiental.value,
                espiritual: espiritual.value,
                intensidade: parseInt(intensidade.value, 10),
                queixas: queixas.value,
                hipoteses: {
                    essencial: essencial.value,
                    especifico: especifico.value,
                    adicional: adicional.value,
                },
                planoAcao: planoAcao.value,
                data: new Date(),
            };

            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/patients/${patientDocRef.id}/sessions`), newSession);

            showMessage("Paciente e anamnese inicial salvos com sucesso!");
            setView('patients');
        } catch (e) {
            console.error("Erro ao adicionar paciente: ", e);
            showMessage("Erro ao salvar o paciente.");
        }
    };

    const handleSessionSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return;
        const newSession = {
            ...anamnesisForm,
            data: new Date(),
        };

        try {
            const docRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/patients/${selectedPatient.id}/sessions`), newSession);
            showMessage("Sessão salva com sucesso!");
            setSelectedPatient(prev => ({
                ...prev,
                sessions: [{ ...newSession, id: docRef.id }, ...(prev.sessions || [])]
            }));
            // Limpa o formulário de anamnese
            setAnamnesisForm({ fisico: '', mental: '', emocional: '', ambiental: '', espiritual: '', queixas: '', intensidade: 5, hipoteses: { essencial: '', especifico: '', adicional: '' }, planoAcao: '' });
        } catch (e) {
            console.error("Erro ao adicionar sessão: ", e);
            showMessage("Erro ao salvar a sessão.");
        }
    };

    // Funções para a Timeline visual
    const getIntensityColor = (intensity) => {
        if (intensity <= 3) return 'bg-emerald-500';
        if (intensity <= 7) return 'bg-yellow-500';
        return 'bg-rose-500';
    };

    // Função de busca
    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredPatients = patients.filter(patient => {
        if (!searchTerm) return true; // Return all patients if search term is empty
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const patientNameMatch = patient.nome.toLowerCase().includes(lowerCaseSearchTerm);
        if (patientNameMatch) return true;

        const sessionSearchMatch = patient.sessions?.some(session => {
            const fieldsToSearch = [
                session.queixas,
                session.planoAcao,
                session.fisico,
                session.mental,
                session.emocional,
                session.ambiental,
                session.espiritual
            ];

            if (fieldsToSearch.some(field => typeof field === 'string' && field.toLowerCase().includes(lowerCaseSearchTerm))) {
                return true;
            }

            const { hipoteses } = session;
            if (hipoteses) {
                if (typeof hipoteses === 'object' && hipoteses !== null) {
                    return Object.values(hipoteses).some(h => typeof h === 'string' && h.toLowerCase().includes(lowerCaseSearchTerm));
                }
                if (typeof hipoteses === 'string' && hipoteses.toLowerCase().includes(lowerCaseSearchTerm)) {
                    return true;
                }
            }

            return false;
        });

        return sessionSearchMatch;
    });

    const renderView = () => {
        // --- Componentes visuais ---
        const PatientList = () => (
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-800">Meus Pacientes</h2>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou palavras-chave..."
                        className="p-2 border border-gray-300 rounded-lg shadow-sm w-1/2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                    <button
                        onClick={() => setView('add-patient')}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-full shadow-lg hover:bg-emerald-700 transition duration-300"
                    >
                        + Novo Paciente
                    </button>
                </div>
                {filteredPatients.length === 0 ? (
                    <p className="text-center text-gray-500">Nenhum paciente encontrado. Tente adicionar um novo.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPatients.map(patient => (
                            <div key={patient.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
                                <h3 className="text-xl font-bold text-gray-800">{patient.nome}</h3>
                                <p className="text-gray-500 mt-1">{patient.email}</p>
                                <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Sessões: {patient.sessions?.length || 0}</span>
                                    {patient.sessions?.[0]?.queixas && patient.sessions[0].queixas.split(',').map(tag => (
                                        <span key={tag} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full">{tag.trim()}</span>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { setSelectedPatient(patient); setView('patient-details'); }}
                                    className="mt-6 w-full bg-sky-600 text-white py-2 rounded-full shadow-lg hover:bg-sky-700 transition duration-300"
                                >
                                    Ver Detalhes
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );

        const PatientDetails = () => (
            <div>
                <button onClick={() => setView('patients')} className="mb-6 flex items-center text-sky-600 hover:underline transition duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Voltar para a lista
                </button>
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200">
                    <h2 className="text-3xl font-bold text-gray-800">{selectedPatient.nome}</h2>
                    <p className="text-gray-500 mt-2">Email: {selectedPatient.email}</p>
                    <p className="text-gray-500">Telefone: {selectedPatient.telefone}</p>

                    {/* Timeline Visual */}
                    <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-800">Timeline de Acompanhamento</h3>
                    <div className="flex flex-col gap-6">
                        {selectedPatient.sessions?.length > 0 ? selectedPatient.sessions.map((session, index) => (
                            <div key={session.id} className="relative pl-8">
                                <div className="absolute left-0 top-0 h-full w-0.5 bg-gray-300"></div>
                                <div className={`absolute -left-1.5 top-0 w-4 h-4 rounded-full ${getIntensityColor(session.intensidade)} border-4 border-white`}></div>
                                <div className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm text-gray-500">
                                            Sessão em: {new Date(session.data?.seconds * 1000).toLocaleDateString()}
                                        </p>
                                        <span className={`px-3 py-1 text-sm font-bold text-white rounded-full ${getIntensityColor(session.intensidade)}`}>
                                            Intensidade: {session.intensidade}/10
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2 text-gray-700">
                                        <p><span className="font-semibold">Queixas:</span> {session.queixas}</p>
                                        {session.hipoteses && (
                                            typeof session.hipoteses === 'object' && session.hipoteses !== null ? (
                                                <div>
                                                    <p className="font-semibold text-gray-700">Hipóteses:</p>
                                                    <div className="pl-4 mt-1 border-l-2 border-sky-100">
                                                        {session.hipoteses.essencial && <p className="text-sm text-gray-600"><span className="font-bold text-gray-700">Essencial:</span> {session.hipoteses.essencial}</p>}
                                                        {session.hipoteses.especifico && <p className="text-sm text-gray-600 mt-1"><span className="font-bold text-gray-700">Específico:</span> {session.hipoteses.especifico}</p>}
                                                        {session.hipoteses.adicional && <p className="text-sm text-gray-600 mt-1"><span className="font-bold text-gray-700">Adicional:</span> {session.hipoteses.adicional}</p>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p><span className="font-semibold">Hipóteses:</span> {session.hipoteses}</p>
                                            )
                                        )}
                                        <p><span className="font-semibold">Plano de Ação:</span> {session.planoAcao}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-200 text-gray-600">
                                        <h4 className="font-semibold">Notas e Anamnese:</h4>
                                        <ul className="list-disc pl-5 mt-2 text-sm">
                                            <li><span className="font-bold">Físico:</span> {session.fisico}</li>
                                            <li><span className="font-bold">Mental:</span> {session.mental}</li>
                                            <li><span className="font-bold">Emocional:</span> {session.emocional}</li>
                                            <li><span className="font-bold">Ambiental:</span> {session.ambiental}</li>
                                            <li><span className="font-bold">Espiritual:</span> {session.espiritual}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center">Nenhuma sessão registrada ainda.</p>
                        )}
                    </div>
                </div>

                {/* Formulário para Nova Sessão */}
                <div className="mt-8">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Registrar Nova Sessão</h3>
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200">
                        <AnamnesisForm onSubmit={handleSessionSubmit} formData={anamnesisForm} setFormData={setAnamnesisForm} />
                    </div>
                </div>
            </div>
        );

        const AddPatientForm = () => {
            const layers = ["Físico", "Mental", "Emocional", "Ambiental", "Espiritual"];
            const [formState, setFormState] = useState({
                nome: '',
                email: '',
                telefone: '',
                historico: '',
                alergias: '',
                medicamentos: '',
                fisico: '',
                mental: '',
                emocional: '',
                ambiental: '',
                espiritual: '',
                intensidade: 5,
                queixas: '',
                hipoteses: { essencial: '', especifico: '', adicional: '' },
                planoAcao: '',
            });

            const handleChange = (e) => {
                const { name, value } = e.target;
                setFormState(prev => ({ ...prev, [name]: value }));
            };

            const handleHipotesesChange = (e) => {
                const { name, value } = e.target;
                setFormState(prev => ({
                    ...prev,
                    hipoteses: {
                        ...prev.hipoteses,
                        [name]: value
                    }
                }));
            };

            const handleIntensityChange = (e) => {
                setFormState(prev => ({ ...prev, intensidade: parseInt(e.target.value, 10) }));
            };

            return (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Cadastro de Paciente e Anamnese Inicial</h2>
                    <form onSubmit={handlePatientSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Nome Completo</label>
                                <input type="text" name="nome" required value={formState.nome} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Email</label>
                                <input type="email" name="email" value={formState.email} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Telefone</label>
                                <input type="text" name="telefone" value={formState.telefone} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Histórico Médico</label>
                                <textarea name="historico" rows="3" value={formState.historico} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"></textarea>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Alergias</label>
                                <textarea name="alergias" rows="3" value={formState.alergias} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"></textarea>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Medicamentos em Uso</label>
                                <textarea name="medicamentos" rows="3" value={formState.medicamentos} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"></textarea>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-200 mt-6">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Anamnese Integrativa Inicial</h3>
                            {layers.map(layer => (
                                <div key={layer} className="mb-4">
                                    <label className="block text-gray-700 font-semibold mb-2">{layer}</label>
                                    <textarea
                                        name={layer.toLowerCase()}
                                        rows="3"
                                        value={formState[layer.toLowerCase()]}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                                    ></textarea>
                                </div>
                            ))}
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Nível de Intensidade: <span className="font-normal text-sky-600">{formState.intensidade}/10</span></label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    name="intensidade"
                                    value={formState.intensidade}
                                    onChange={handleIntensityChange}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Tags de Queixas (separadas por vírgula)</label>
                                <input
                                    type="text"
                                    name="queixas"
                                    value={formState.queixas}
                                    onChange={handleChange}
                                    placeholder="ex: ansiedade, dor crônica, insônia"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Hipóteses Integrativas - Essencial</label>
                                <textarea
                                    name="essencial"
                                    rows="3"
                                    value={formState.hipoteses.essencial}
                                    onChange={handleHipotesesChange}
                                    placeholder="Aspectos cruciais que precisam ser abordados."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Hipóteses Integrativas - Específico</label>
                                <textarea
                                    name="especifico"
                                    rows="3"
                                    value={formState.hipoteses.especifico}
                                    onChange={handleHipotesesChange}
                                    placeholder="Detalhes e observações secundárias."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Hipóteses Integrativas - Adicional</label>
                                <textarea
                                    name="adicional"
                                    rows="3"
                                    value={formState.hipoteses.adicional}
                                    onChange={handleHipotesesChange}
                                    placeholder="Informações complementares e pontos de atenção."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-2">Plano de Ação e Metas</label>
                                <textarea
                                    name="planoAcao"
                                    rows="4"
                                    value={formState.planoAcao}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => setView('patients')} className="px-6 py-3 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition duration-300">
                                Cancelar
                            </button>
                            <button type="submit" className="px-6 py-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition duration-300">
                                Salvar Paciente
                            </button>
                        </div>
                    </form>
                </div>
            );
        };

        const AnamnesisForm = ({ onSubmit, formData, setFormData }) => {
            const layers = ["Físico", "Mental", "Emocional", "Ambiental", "Espiritual"];
            const handleChange = (e) => {
                const { name, value } = e.target;
                setFormData(prev => ({ ...prev, [name]: value }));
            };

            const handleHipotesesChange = (e) => {
                const { name, value } = e.target;
                setFormData(prev => ({
                    ...prev,
                    hipoteses: {
                        ...prev.hipoteses,
                        [name]: value
                    }
                }));
            };

            const handleIntensityChange = (e) => {
                setFormData(prev => ({ ...prev, intensidade: parseInt(e.target.value, 10) }));
            };

            const handleTagsChange = (e) => {
                setFormData(prev => ({ ...prev, queixas: e.target.value }));
            };

            const duplicateLastAnamnesis = () => {
                if (selectedPatient && selectedPatient.sessions?.length > 0) {
                    const lastSession = selectedPatient.sessions[0];

                    // Duplicates hypotheses, handling both old (string) and new (object) data structures.
                    const lastHipoteses = (typeof lastSession.hipoteses === 'object' && lastSession.hipoteses !== null)
                        ? lastSession.hipoteses
                        : { essencial: lastSession.hipoteses || '', especifico: '', adicional: '' };

                    setFormData({
                        fisico: lastSession.fisico,
                        mental: lastSession.mental,
                        emocional: lastSession.emocional,
                        ambiental: lastSession.ambiental,
                        espiritual: lastSession.espiritual,
                        intensidade: lastSession.intensidade,
                        queixas: lastSession.queixas,
                        hipoteses: lastHipoteses,
                        planoAcao: '', // Plano de Ação is always new
                    });
                    showMessage("Última anamnese duplicada!");
                }
            };

            return (
                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={duplicateLastAnamnesis}
                            disabled={!selectedPatient || selectedPatient.sessions?.length === 0}
                            className="bg-sky-100 text-sky-800 px-4 py-2 rounded-full text-sm hover:bg-sky-200 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Duplicar Anamnese Anterior
                        </button>
                    </div>

                    {layers.map(layer => (
                        <div key={layer}>
                            <label className="block text-gray-700 font-semibold mb-2">{layer}</label>
                            <textarea
                                name={layer.toLowerCase()}
                                rows="3"
                                value={formData[layer.toLowerCase()]}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                            ></textarea>
                        </div>
                    ))}

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Nível de Intensidade: <span className="font-normal text-sky-600">{formData.intensidade}/10</span></label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            name="intensidade"
                            value={formData.intensidade}
                            onChange={handleIntensityChange}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Tags de Queixas (separadas por vírgula)</label>
                        <input
                            type="text"
                            name="queixas"
                            value={formData.queixas}
                            onChange={handleTagsChange}
                            placeholder="ex: ansiedade, dor crônica, insônia"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Hipóteses Integrativas - Essencial</label>
                        <textarea
                            name="essencial"
                            rows="3"
                            value={formData.hipoteses.essencial}
                            onChange={handleHipotesesChange}
                            placeholder="Aspectos cruciais que precisam ser abordados."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Hipóteses Integrativas - Específico</label>
                        <textarea
                            name="especifico"
                            rows="3"
                            value={formData.hipoteses.especifico}
                            onChange={handleHipotesesChange}
                            placeholder="Detalhes e observações secundárias."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Hipóteses Integrativas - Adicional</label>
                        <textarea
                            name="adicional"
                            rows="3"
                            value={formData.hipoteses.adicional}
                            onChange={handleHipotesesChange}
                            placeholder="Informações complementares e pontos de atenção."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Plano de Ação e Metas</label>
                        <textarea
                            name="planoAcao"
                            rows="4"
                            value={formData.planoAcao}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="submit" className="px-6 py-3 bg-sky-600 text-white rounded-full shadow-lg hover:bg-sky-700 transition duration-300">
                            Salvar Sessão
                        </button>
                    </div>
                </form>
            );
        };

        // Renderiza a view correta com base no estado 'view'
        switch (view) {
            case 'patients':
                return <PatientList />;
            case 'patient-details':
                return selectedPatient ? <PatientDetails /> : <PatientList />;
            case 'add-patient':
                return <AddPatientForm />;
            case 'dashboard':
            default:
                return <PatientList />;
        }
    };

    return (
        <div className="font-sans bg-gray-50 min-h-screen">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
                .range-lg::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #0ea5e9; /* sky-500 */
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    transition: background-color 0.3s;
                }
                .range-lg::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    background: #0ea5e9; /* sky-500 */
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    transition: background-color 0.3s;
                }
                .range-lg:hover::-webkit-slider-thumb {
                    background: #0369a1; /* sky-700 */
                }
                .range-lg:hover::-moz-range-thumb {
                    background: #0369a1; /* sky-700 */
                }
                `}
            </style>
            <script src="https://cdn.tailwindcss.com"></script>

            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Cabeçalho */}
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-4xl font-bold text-gray-900">SynergyCare</h1>
                    </div>
                    {isAuthReady && userId && (
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="font-semibold">ID do Usuário:</span>
                            <span className="bg-gray-200 px-3 py-1 rounded-full">{userId}</span>
                        </div>
                    )}
                </div>

                {/* Área de Mensagens */}
                {isMessageVisible && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-sky-500 text-white text-sm rounded-full shadow-lg transition-opacity duration-300">
                        {message}
                    </div>
                )}

                {renderView()}

            </div>
        </div>
    );
};

export default App;
