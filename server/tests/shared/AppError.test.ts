import { AppError } from '../../src/shared/AppError'

describe('AppError', () => {
  it('deve criar erro com mensagem e statusCode padrão 500', () => {
    const err = new AppError('Algo deu errado')
    expect(err.message).toBe('Algo deu errado')
    expect(err.statusCode).toBe(500)
    expect(err).toBeInstanceOf(Error)
  })

  it('deve aceitar statusCode customizado', () => {
    const err = new AppError('Não encontrado', 404)
    expect(err.message).toBe('Não encontrado')
    expect(err.statusCode).toBe(404)
  })

  it('deve aceitar statusCode 400 para validação', () => {
    const err = new AppError('Campo obrigatório', 400)
    expect(err.message).toBe('Campo obrigatório')
    expect(err.statusCode).toBe(400)
  })
})
