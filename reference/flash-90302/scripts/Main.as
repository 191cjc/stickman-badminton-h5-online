package
{
   import Playtomic.Log;
   import §_-2s§.§_-53§;
   import bobby.§ try§;
   import bobby.§_-0v§;
   import bobby.§_-1Q§;
   import bobby.§_-3h§;
   import bobby.§_-4n§;
   import bobby.§_-6§;
   import bobby.§null §;
   import flash.display.MovieClip;
   import flash.utils.setTimeout;
   
   [SWF(width="640", height="426", backgroundColor="#333333", frameRate="60")]
   public class Main extends MovieClip
   {
      
      public var thePreloader:§_-53§;
      
      public function Main()
      {
         super();
         addFrameScript(11,this.frame12,32,this.frame33,42,this.frame43,71,this.frame72,81,this.frame82,92,this.frame93);
         setTimeout(this.init,100);
      }
      
      private function init() : *
      {
         stop();
         §_-1Q§.init(this);
         § try§.init(this);
         §_-0v§.init(this,true);
         §_-4n§.init(this,true);
         §_-3h§.init(this);
         §_-6§.init(this);
         §null §.init(this);
         §_-0v§.§_-2r§ = "http://www.kongregate.com/?haref=stickfigurebadminton2&src=spon&cm=stickfigurebadminton2";
         §_-0v§.§else§ = "http://www.effinggames.com/?utm_source=game&utm_medium=all&utm_campaign=stickbadminton2";
         §_-0v§.§_-4S§(new §_-53§());
         Log.View(8120,"9fd05594863e41dc","8301993fdc83431a862246592c21da",root.loaderInfo);
      }
      
      internal function frame12() : *
      {
         stop();
      }
      
      internal function frame33() : *
      {
      }
      
      internal function frame43() : *
      {
      }
      
      internal function frame72() : *
      {
      }
      
      internal function frame82() : *
      {
      }
      
      internal function frame93() : *
      {
      }
   }
}

