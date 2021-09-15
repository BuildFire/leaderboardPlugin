class UserSetting {
    constructor(data = {}) {
        this.createdOn = data.createdOn || new Date();
        this.isSubscribedToPN = data.isSubscribedToPN || true;
        this._buildfire = data._buildfire || {};
        this.isActive = (typeof data.isActive === 'undefined') ? true : data.isActive;
        this.createdBy = data.createdBy || undefined;
        this.lastUpdatedOn = data.lastUpdatedOn || undefined;
        this.lastUpdatedBy = data.lastUpdatedBy || undefined;
        this.deletedOn = data.deletedOn || undefined;
        this.deletedBy = data.deletedBy || undefined;
    }
}
