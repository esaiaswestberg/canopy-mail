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
	export class Attachment {
	    name: string;
	    contentType: string;
	    size: number;
	    data: number[];
	
	    static createFrom(source: any = {}) {
	        return new Attachment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.contentType = source["contentType"];
	        this.size = source["size"];
	        this.data = source["data"];
	    }
	}
	export class EmailSender {
	    name: string;
	    email: string;
	
	    static createFrom(source: any = {}) {
	        return new EmailSender(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	    }
	}
	export class EmailDetail {
	    id: string;
	    uid: number;
	    sender: EmailSender;
	    subject: string;
	    preview: string;
	    timestamp: string;
	    isRead: boolean;
	    isStarred: boolean;
	    hasAttachment: boolean;
	    folderId: string;
	    accountId: string;
	    bodyHtml: string;
	    recipients: EmailSender[];
	    cc: EmailSender[];
	    attachments: Attachment[];
	
	    static createFrom(source: any = {}) {
	        return new EmailDetail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.uid = source["uid"];
	        this.sender = this.convertValues(source["sender"], EmailSender);
	        this.subject = source["subject"];
	        this.preview = source["preview"];
	        this.timestamp = source["timestamp"];
	        this.isRead = source["isRead"];
	        this.isStarred = source["isStarred"];
	        this.hasAttachment = source["hasAttachment"];
	        this.folderId = source["folderId"];
	        this.accountId = source["accountId"];
	        this.bodyHtml = source["bodyHtml"];
	        this.recipients = this.convertValues(source["recipients"], EmailSender);
	        this.cc = this.convertValues(source["cc"], EmailSender);
	        this.attachments = this.convertValues(source["attachments"], Attachment);
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
	export class EmailListItem {
	    id: string;
	    uid: number;
	    sender: EmailSender;
	    subject: string;
	    preview: string;
	    timestamp: string;
	    isRead: boolean;
	    isStarred: boolean;
	    hasAttachment: boolean;
	    folderId: string;
	    accountId: string;
	
	    static createFrom(source: any = {}) {
	        return new EmailListItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.uid = source["uid"];
	        this.sender = this.convertValues(source["sender"], EmailSender);
	        this.subject = source["subject"];
	        this.preview = source["preview"];
	        this.timestamp = source["timestamp"];
	        this.isRead = source["isRead"];
	        this.isStarred = source["isStarred"];
	        this.hasAttachment = source["hasAttachment"];
	        this.folderId = source["folderId"];
	        this.accountId = source["accountId"];
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
	export class EmailPage {
	    emails: EmailListItem[];
	    total: number;
	    hasMore: boolean;
	    nextCursor: number;
	
	    static createFrom(source: any = {}) {
	        return new EmailPage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.emails = this.convertValues(source["emails"], EmailListItem);
	        this.total = source["total"];
	        this.hasMore = source["hasMore"];
	        this.nextCursor = source["nextCursor"];
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
	
	export class Folder {
	    id: string;
	    label: string;
	    icon: string;
	    unreadCount: number;
	    isSystem: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Folder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.icon = source["icon"];
	        this.unreadCount = source["unreadCount"];
	        this.isSystem = source["isSystem"];
	    }
	}
	export class SendRequest {
	    accountId: string;
	    to: string[];
	    subject: string;
	    bodyHtml: string;
	    attachments: Attachment[];
	
	    static createFrom(source: any = {}) {
	        return new SendRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accountId = source["accountId"];
	        this.to = source["to"];
	        this.subject = source["subject"];
	        this.bodyHtml = source["bodyHtml"];
	        this.attachments = this.convertValues(source["attachments"], Attachment);
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

