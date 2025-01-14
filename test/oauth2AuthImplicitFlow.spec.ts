import { AlfrescoApiConfig } from '../src/alfrescoApiConfig';
import { AlfrescoApi } from '../src/alfrescoApi';
import { Oauth2Auth } from '../src/authentication/oauth2Auth';

const expect = require('chai').expect;

declare let window: any;
const globalAny: any = global;
const chai = require('chai');
const spies = require('chai-spies');
chai.use(spies);
import { Storage } from '../src/storage';

describe('Oauth2 Implicit flow test', () => {
    let oauth2Auth: Oauth2Auth;
    let alfrescoJsApi: AlfrescoApi;

    beforeEach(() => {
        alfrescoJsApi = new AlfrescoApi({
            hostEcm: ''
        } as AlfrescoApiConfig);
    });

    it('should throw an error if redirectUri is not present', (done) => {
        try {
            oauth2Auth = new Oauth2Auth(
                <any> {
                    oauth2: {
                        host: 'http://myOauthUrl:30081/auth/realms/springboot',
                        clientId: 'activiti',
                        secret: '',
                        scope: 'openid',
                        implicitFlow: true
                    }
                },
                alfrescoJsApi
            );
        } catch (error) {
            expect(error).to.be.equal('Missing redirectUri required parameter');
            done();
        }
    });

    it('should redirect to login if access token is not valid', (done) => {
        window = globalAny.window = { location: {} };
        globalAny.document = {
            getElementById: () => {
                return ''
            }
        };

        oauth2Auth = new Oauth2Auth(
            {
                oauth2: {
                    host: 'http://myOauthUrl:30081/auth/realms/springboot',
                    clientId: 'activiti',
                    secret: '',
                    scope: 'openid',
                    implicitFlow: true,
                    redirectUri: 'redirectUri'
                }
            } as AlfrescoApiConfig,
            alfrescoJsApi
        );

        oauth2Auth.on('implicit_redirect', () => {
            expect(window.location.href).contain('http://myOauthUrl:30081/auth/realms/springboot/protocol/' +
                'openid-connect/auth?');
            done();
        });

        oauth2Auth.implicitLogin();
    });

    it('should not loop over redirection when redirectUri contains hash and token is not valid ', (done) => {
        window = globalAny.window = { location: {} };
        globalAny.document = {
            getElementById: () => {
                return ''
            }
        };
        oauth2Auth = new Oauth2Auth(
            {
                oauth2: {
                    host: 'http://myOauthUrl:30081/auth/realms/springboot',
                    clientId: 'activiti',
                    secret: '',
                    scope: 'openid',
                    implicitFlow: true,
                    redirectUri: '#/redirectUri'
                }
            } as AlfrescoApiConfig,
            alfrescoJsApi
        );

        const redirectLoginSpy = chai.spy.on(oauth2Auth.storage, 'setItem');

        oauth2Auth.on('implicit_redirect', () => {
            expect(window.location.href).contain('http://myOauthUrl:30081/auth/realms/springboot/protocol/' +
                'openid-connect/auth?');
            expect(redirectLoginSpy).to.have.been.called(1);
            done();
        });

        oauth2Auth.implicitLogin();
    });

    it('should not redirect to login if access token is valid', (done) => {
        window = globalAny.window = { location: {} };
        globalAny.document = {
            getElementById: () => {
                return ''
            }
        };
        oauth2Auth = new Oauth2Auth(
            {
                oauth2: {
                    host: 'http://myOauthUrl:30081/auth/realms/springboot',
                    clientId: 'activiti',
                    secret: '',
                    scope: 'openid',
                    implicitFlow: true,
                    redirectUri: 'redirectUri'
                }
            } as AlfrescoApiConfig,
            alfrescoJsApi
        );

        oauth2Auth.isValidAccessToken = () => {
            return true;
        };
        oauth2Auth.isValidToken = () => {
            return true;
        };

        oauth2Auth.on('token_issued', () => {
            expect(window.location.url).to.be.equal(undefined);
            done();
        });

        oauth2Auth.setToken('new_token', 'new_refresh_token');

        oauth2Auth.implicitLogin();
    });

    it('should set the loginFragment to redirect after the login if it is present', (done) => {
        window = globalAny.window = {};
        globalAny.document = {
            getElementById: () => {
                return ''
            }
        };
        window.location = <Location> { hash: 'asfasfasfa' };

        Object.defineProperty(window.location, 'hash', {
            writable: true,
            value: '#/redirect-path&session_state=eqfqwfqwf'
        });

        Object.defineProperty(window.location, 'href', {
            writable: true,
            value: 'http://stoca/#/redirect-path&session_state=eqfqwfqwf'
        });

        oauth2Auth = new Oauth2Auth(
            {
                oauth2: {
                    host: 'http://myOauthUrl:30081/auth/realms/springboot',
                    clientId: 'activiti',
                    secret: '',
                    scope: 'openid',
                    implicitFlow: true,
                    redirectUri: 'redirectUri'
                }
            } as AlfrescoApiConfig,
            alfrescoJsApi
        );
        oauth2Auth.storage = new Storage();
        const setItemSpy = chai.spy.on(oauth2Auth.storage, 'setItem');

        oauth2Auth.on('implicit_redirect', () => {
            expect(window.location.href).contain('http://myOauthUrl:30081/auth/realms/springboot/protocol/' +
                'openid-connect/auth?');
            expect(setItemSpy).to.have.been.called.with('loginFragment', '/redirect-path&session_state=eqfqwfqwf');
            done();
        });

        oauth2Auth.implicitLogin();
    });
});
