export namespace main {
	
	export class ServerConfig {
	    host: string;
	    port: number;
	    security: string;
	    username: string;
	    authMethod: string;
	
	    static createFrom(source: any = {}) {
	        return new ServerConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.host = source["host"];
	        this.port = source["port"];
	        this.security = source["security"];
	        this.username = source["username"];
	        this.authMethod = source["authMethod"];
	    }
	}
	export class Account {
	    id: string;
	    email: string;
	    displayName: string;
	    avatarInitials: string;
	    avatarColor: string;
	    imap: ServerConfig;
	    smtp: ServerConfig;
	
	    static createFrom(source: any = {}) {
	        return new Account(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.email = source["email"];
	        this.displayName = source["displayName"];
	        this.avatarInitials = source["avatarInitials"];
	        this.avatarColor = source["avatarColor"];
	        this.imap = this.convertValues(source["imap"], ServerConfig);
	        this.smtp = this.convertValues(source["smtp"], ServerConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AddAccountRequest {
	    email: string;
	    displayName: string;
	    avatarColor: string;
	    password: string;
	    imap: ServerConfig;
	    smtp: ServerConfig;
	
	    static createFrom(source: any = {}) {
	        return new AddAccountRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.email = source["email"];
	        this.displayName = source["displayName"];
	        this.avatarColor = source["avatarColor"];
	        this.password = source["password"];
	        this.imap = this.convertValues(source["imap"], ServerConfig);
	        this.smtp = this.convertValues(source["smtp"], ServerConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class UpdateAccountRequest {
	    id: string;
	    displayName: string;
	    avatarColor: string;
	    imap: ServerConfig;
	    smtp: ServerConfig;
	
	    static createFrom(source: any = {}) {
	        return new UpdateAccountRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.displayName = source["displayName"];
	        this.avatarColor = source["avatarColor"];
	        this.imap = this.convertValues(source["imap"], ServerConfig);
	        this.smtp = this.convertValues(source["smtp"], ServerConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

