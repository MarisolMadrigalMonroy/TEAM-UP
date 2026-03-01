import Form from '../components/Form'

/*
* Componente que representa la página de inicio de sesión
*/
function Login() {
    return <Form route='/api/token/' method='login'/>
}

export default Login