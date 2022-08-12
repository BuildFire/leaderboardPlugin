const stringsConfig = {
    score: {
        title: "Score Input"
        , subtitle: ""
        , labels: {
            add: {
                title: "Enter Score Title",
                defaultValue: "Add Score",
                maxLength: 30
            },
            addSubtitle: {
                title: "Enter Score Subtitle",
                defaultValue: "Add Score Enter your score here. You may add more than one score in a day!",
                maxLength: 100,
            }
            , edit: {
                title: "Edit Score Title"
                , defaultValue: "Edit Score"
                , maxLength: 30
            }
            , editSubtitle: {
                title: "Edit Score Subtitle"
                , defaultValue: "Enter your score here. You may edit only today's score!"
                , maxLength: 60
            }
        }
    },
    scoreboard: {
        title: "Scoreboard"
        , subtitle: ""
        , labels: {
            overall: {
                title: "Overall",
                defaultValue: "Overall",
                maxLength: 10,
            },
            day: {
                title: "Day",
                defaultValue: "Day",
                maxLength: 10,
            }
            , week: {
                title: "Week"
                , defaultValue: "Week"
                , maxLength: 10
            }
            , month: {
                title: "Month"
                , defaultValue: "Month"
                , maxLength: 10
            }
        }
    }
};
